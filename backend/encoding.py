"""
encoding.py – handles video (FFmpeg), image (Pillow), and audio (FFmpeg) encoding.
"""
import subprocess
import json
import os
import re
import threading
from typing import Optional

from PIL import Image

from .models import EncodingOptions, MediaMetadata, Job, EditParams
from . import jobs as job_manager

# ---------------------------------------------------------------------------
# Probe / analyse helpers
# ---------------------------------------------------------------------------

def probe_video_or_audio(path: str) -> MediaMetadata:
    """Run ffprobe on a video or audio file and return MediaMetadata."""
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_streams", "-show_format",
        path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr}")

    data = json.loads(result.stdout)
    video_stream = next(
        (s for s in data.get("streams", []) if s.get("codec_type") == "video"), None
    )
    audio_stream = next(
        (s for s in data.get("streams", []) if s.get("codec_type") == "audio"), None
    )

    duration = float(data.get("format", {}).get("duration", 0))
    audio_channels = int(audio_stream.get("channels", 0)) if audio_stream else 0

    if video_stream:
        fps_raw = video_stream.get("r_frame_rate", "30/1")
        try:
            num, den = fps_raw.split("/")
            fps = round(int(num) / max(int(den), 1))
        except Exception:
            fps = 30
        return MediaMetadata(
            width=int(video_stream.get("width", 0)),
            height=int(video_stream.get("height", 0)),
            fps=fps,
            duration=duration,
            codec=video_stream.get("codec_name", "unknown"),
            audioChannels=audio_channels,
            mime_type="video/mp4",
            originalPath=path,
        )
    elif audio_stream:
        return MediaMetadata(
            duration=duration,
            codec=audio_stream.get("codec_name", "unknown"),
            audioChannels=audio_channels,
            mime_type="audio/mpeg",
            originalPath=path,
        )
    else:
        raise ValueError("No video or audio stream found in file.")


# Keep backward-compatible alias used by main.py
probe_video = probe_video_or_audio


def probe_image(path: str) -> MediaMetadata:
    """Use Pillow to probe an image file."""
    with Image.open(path) as img:
        mode = img.mode              # "RGB", "RGBA", "L", etc.
        channels = len(mode)
        bit_depth = 8
        try:
            # Pillow may expose this for some formats
            bit_depth = img.bits  # type: ignore[attr-defined]
        except AttributeError:
            pass
        return MediaMetadata(
            width=img.width,
            height=img.height,
            codec=img.format.lower() if img.format else "unknown",
            channels=channels,
            bitDepth=bit_depth,
            mime_type=f"image/{(img.format or 'jpeg').lower()}",
            originalPath=path,
        )


def analyze_any(path: str) -> MediaMetadata:
    """Auto-detect media type and return metadata."""
    ext = os.path.splitext(path)[1].lower()
    image_exts = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff", ".tif"}
    if ext in image_exts:
        return probe_image(path)
    return probe_video_or_audio(path)


# ---------------------------------------------------------------------------
# Edit / transform helpers
# ---------------------------------------------------------------------------

def build_edit_filters(edit: Optional[EditParams]) -> list:
    """Return FFmpeg vf filter fragments for crop/rotate/flip, in correct order."""
    if edit is None:
        return []
    filters: list = []
    if edit.crop:
        c = edit.crop
        filters.append(f"crop={c.w}:{c.h}:{c.x}:{c.y}")
    if edit.rotate == 90:
        filters.append("transpose=1")
    elif edit.rotate == 180:
        filters.append("transpose=1,transpose=1")
    elif edit.rotate == 270:
        filters.append("transpose=2")
    if edit.flipH:
        filters.append("hflip")
    if edit.flipV:
        filters.append("vflip")
    return filters


def run_preview_edit(
    input_path: str,
    edit: Optional[EditParams],
    preview_path: str,
    preview_duration: float = 5.0,
) -> str:
    """Produce a quick (5 s) preview clip with edit transforms applied."""
    filters = build_edit_filters(edit)
    cmd = ["ffmpeg", "-y", "-i", input_path, "-t", str(preview_duration)]
    if filters:
        cmd += ["-vf", ",".join(filters)]
    if edit and edit.fixOrientation:
        cmd += ["-metadata:s:v:0", "rotate=0"]
    cmd += [
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
        "-c:a", "aac", "-b:a", "64k",
        "-movflags", "+faststart",
        preview_path,
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=60)
    if result.returncode != 0:
        raise RuntimeError(
            f"Edit preview failed: {result.stderr.decode(errors='replace')[:500]}"
        )
    return preview_path


# ---------------------------------------------------------------------------
# Video encoding (FFmpeg)
# ---------------------------------------------------------------------------

def _build_video_ffmpeg_cmd(
    input_path: str,
    output_path: str,
    options: EncodingOptions,
    trim_start: Optional[float] = None,
    trim_end: Optional[float] = None,
    remove_audio: bool = False,
    normalize_loudness: bool = False,
    watermark_text: str = "",
    watermark_position: str = "bottomright",
    watermark_logo_path: str = "",
    silence_trim: bool = False,
    edit_params: Optional[EditParams] = None,
) -> list:
    width, height = [int(x) for x in options.resolution.split("x")]
    vf_filters = build_edit_filters(edit_params)  # edit transforms first

    if options.aspectMode == "crop":
        aspect = width / height
        vf_filters.append(
            f"crop=if(gte(iw/ih\\,{aspect:.6f})\\,ih*{aspect:.6f}\\,iw):"
            f"if(gte(iw/ih\\,{aspect:.6f})\\,ih\\,iw/{aspect:.6f})"
        )
        vf_filters.append(f"scale={width}:{height}")
    elif options.aspectMode in ("pad", "letterbox"):
        vf_filters.append(f"scale={width}:{height}:force_original_aspect_ratio=decrease")
        vf_filters.append(f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black")
    else:
        vf_filters.append(f"scale={width}:{height}")

    # Text watermark via drawtext
    if watermark_text:
        pos_map = {
            "bottomright": f"x=w-tw-10:y=h-th-10",
            "bottomleft":  f"x=10:y=h-th-10",
            "topleft":     f"x=10:y=10",
            "topright":    f"x=w-tw-10:y=10",
            "center":      f"x=(w-tw)/2:y=(h-th)/2",
        }
        pos_expr = pos_map.get(watermark_position, "x=w-tw-10:y=h-th-10")
        safe_text = watermark_text.replace(":", "\\:").replace("'", "\\'")
        vf_filters.append(
            f"drawtext=text='{safe_text}':fontsize=h/20:fontcolor=white@0.75:"
            f"borderw=2:bordercolor=black@0.5:{pos_expr}"
        )

    # Logo/image watermark via overlay
    if watermark_logo_path and os.path.isfile(watermark_logo_path):
        pos_map_logo = {
            "bottomright": "W-w-10:H-h-10",
            "bottomleft":  "10:H-h-10",
            "topleft":     "10:10",
            "topright":    "W-w-10:10",
            "center":      "(W-w)/2:(H-h)/2",
        }
        pos_logo = pos_map_logo.get(watermark_position, "W-w-10:H-h-10")
        vf_str = ",".join(vf_filters) if vf_filters else "null"
        vf_filters = [f"[0:v]{vf_str}[base];[base][1:v]overlay={pos_logo}"]

    codec_map = {"h264": "libx264", "h265": "libx265", "av1": "libaom-av1"}
    video_codec = codec_map.get(options.codec, "libx264")
    preset = "medium" if options.deviceClass == "desktop" else "fast"

    cmd = ["ffmpeg", "-y"]
    # Trim input: -ss before -i is fast seek (keyframe accurate)
    if trim_start is not None and trim_start > 0:
        cmd += ["-ss", str(trim_start)]
    cmd += ["-i", input_path]

    # Logo overlay input
    if watermark_logo_path and os.path.isfile(watermark_logo_path):
        cmd += ["-i", watermark_logo_path]

    # Duration of trimmed segment
    if trim_end is not None:
        start = trim_start or 0.0
        cmd += ["-t", str(trim_end - start)]

    if vf_filters:
        if watermark_logo_path and os.path.isfile(watermark_logo_path):
            cmd += ["-filter_complex", vf_filters[0], "-map", "[0:v]"]
        else:
            cmd += ["-vf", ",".join(vf_filters)]

    cmd += ["-c:v", video_codec]
    if options.crf is not None:
        cmd += ["-crf", str(options.crf)]
        # Use bitrate as a maxrate cap only — prevents file bloat in complex scenes
        # but never forces a target rate (which would inflate small files).
        if options.bitrate and video_codec != "libaom-av1":
            # Parse suffix to derive bufsize (2× maxrate)
            raw = options.bitrate
            if raw.endswith("M"):
                bufsize = f"{int(raw[:-1]) * 2}M"
            elif raw.endswith("k"):
                bufsize = f"{int(raw[:-1]) * 2}k"
            else:
                bufsize = raw
            cmd += ["-maxrate", raw, "-bufsize", bufsize]
    elif options.bitrate:
        # No CRF — fall back to a proper ABR target (audio-only or AV1 path)
        cmd += ["-b:v", options.bitrate]
    if video_codec != "libaom-av1":
        cmd += ["-preset", preset]
    if options.fps:
        cmd += ["-r", str(options.fps)]

    if remove_audio:
        cmd += ["-an"]
    elif normalize_loudness:
        cmd += ["-c:a", "aac", "-b:a", "128k", "-af", "loudnorm"]
    else:
        cmd += ["-c:a", "aac", "-b:a", "128k"]

    cmd += ["-movflags", "+faststart", "-f", "mp4", output_path]
    return cmd


def _run_video_encoding(
    job_id: str,
    input_path: str,
    output_path: str,
    options: EncodingOptions,
    duration: float,
    trim_start: Optional[float] = None,
    trim_end: Optional[float] = None,
    remove_audio: bool = False,
    normalize_loudness: bool = False,
    watermark_text: str = "",
    watermark_position: str = "bottomright",
    watermark_logo_path: str = "",
    silence_trim: bool = False,
    edit_params: Optional[EditParams] = None,
) -> None:
    job = job_manager.get_job(job_id)
    if not job:
        return
    job = job.model_copy(update={"status": "encoding"})
    job_manager.update_job(job)

    # Effective duration for progress calc (trimmed segment)
    eff_duration = duration
    if trim_start is not None or trim_end is not None:
        start = trim_start or 0.0
        end = trim_end if trim_end is not None else duration
        eff_duration = max(end - start, 1.0)

    cmd = _build_video_ffmpeg_cmd(
        input_path, output_path, options, trim_start, trim_end,
        remove_audio=remove_audio,
        normalize_loudness=normalize_loudness,
        watermark_text=watermark_text,
        watermark_position=watermark_position,
        watermark_logo_path=watermark_logo_path,
        silence_trim=silence_trim,
        edit_params=edit_params,
    )
    try:
        process = subprocess.Popen(cmd, stderr=subprocess.PIPE, universal_newlines=True)
        time_re = re.compile(r"time=(\d+):(\d+):(\d+\.\d+)")
        for line in process.stderr:  # type: ignore[union-attr]
            m = time_re.search(line)
            if m and eff_duration > 0:
                h, mi, s = m.groups()
                elapsed = int(h) * 3600 + int(mi) * 60 + float(s)
                progress = min(elapsed / eff_duration, 0.99)
                job = job.model_copy(update={"progress": progress})
                job_manager.update_job(job)
        process.wait()

        if process.returncode == 0:
            try:
                out_meta = probe_video_or_audio(output_path)
            except Exception:
                out_meta = None
            # Compute size stats
            orig_size = os.path.getsize(input_path) if os.path.isfile(input_path) else None
            comp_size = os.path.getsize(output_path) if os.path.isfile(output_path) else None
            pct_saved = round((1 - comp_size / orig_size) * 100, 1) if orig_size and comp_size and orig_size > 0 else None
            job = job.model_copy(update={
                "status": "done", "progress": 1.0, "output": out_meta,
                "original_size": orig_size, "compressed_size": comp_size, "percent_saved": pct_saved,
            })
        else:
            job = job.model_copy(update={"status": "failed", "error": "FFmpeg returned non-zero exit code."})
    except Exception as exc:
        job = job.model_copy(update={"status": "failed", "error": str(exc)})
    job_manager.update_job(job)


# ---------------------------------------------------------------------------
# Image encoding (Pillow)
# ---------------------------------------------------------------------------

def _run_image_encoding(
    job_id: str,
    input_path: str,
    output_path: str,
    options: EncodingOptions,
) -> None:
    job = job_manager.get_job(job_id)
    if not job:
        return
    job = job.model_copy(update={"status": "encoding", "progress": 0.1})
    job_manager.update_job(job)

    try:
        img = Image.open(input_path)

        # Convert to RGB for JPEG compatibility (no alpha channel)
        if options.codec in ("jpg", "jpeg") and img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")

        # Resize if resolution is specified
        if options.resolution:
            w, h = [int(x) for x in options.resolution.split("x")]
            if options.aspectMode == "crop":
                img_ratio = img.width / img.height
                target_ratio = w / h
                if img_ratio > target_ratio:
                    new_w = int(img.height * target_ratio)
                    left = (img.width - new_w) // 2
                    img = img.crop((left, 0, left + new_w, img.height))
                else:
                    new_h = int(img.width / target_ratio)
                    top = (img.height - new_h) // 2
                    img = img.crop((0, top, img.width, top + new_h))
                img = img.resize((w, h), Image.LANCZOS)
            elif options.aspectMode in ("pad", "letterbox"):
                img.thumbnail((w, h), Image.LANCZOS)
                background = Image.new("RGB", (w, h), (0, 0, 0))
                offset = ((w - img.width) // 2, (h - img.height) // 2)
                background.paste(img, offset)
                img = background
            else:
                img = img.resize((w, h), Image.LANCZOS)

        job = job.model_copy(update={"progress": 0.7})
        job_manager.update_job(job)

        quality = options.crf if options.crf is not None else 85
        fmt = "WEBP" if options.codec == "webp" else "JPEG"
        img.save(output_path, format=fmt, quality=quality, optimize=True)

        out_meta = probe_image(output_path)
        # Compute size stats
        orig_size = os.path.getsize(input_path) if os.path.isfile(input_path) else None
        comp_size = os.path.getsize(output_path) if os.path.isfile(output_path) else None
        pct_saved = round((1 - comp_size / orig_size) * 100, 1) if orig_size and comp_size and orig_size > 0 else None
        job = job.model_copy(update={
            "status": "done", "progress": 1.0, "output": out_meta,
            "original_size": orig_size, "compressed_size": comp_size, "percent_saved": pct_saved,
        })
    except Exception as exc:
        job = job.model_copy(update={"status": "failed", "error": str(exc)})

    job_manager.update_job(job)


# ---------------------------------------------------------------------------
# Audio encoding (FFmpeg)
# ---------------------------------------------------------------------------

def _build_audio_ffmpeg_cmd(
    input_path: str,
    output_path: str,
    options: EncodingOptions,
    trim_start: Optional[float] = None,
    trim_end: Optional[float] = None,
    normalize_loudness: bool = False,
    silence_trim: bool = False,
) -> list:
    codec = "libmp3lame" if options.codec == "mp3" else "libopus"
    bitrate = options.bitrate or "128k"
    cmd = ["ffmpeg", "-y"]
    if trim_start is not None and trim_start > 0:
        cmd += ["-ss", str(trim_start)]
    cmd += ["-i", input_path]
    if trim_end is not None:
        start = trim_start or 0.0
        cmd += ["-t", str(trim_end - start)]

    af_filters = []
    if silence_trim:
        af_filters.append("silenceremove=1:0:-50dB:1:0:-50dB")
    if normalize_loudness:
        af_filters.append("loudnorm")
    if af_filters:
        cmd += ["-af", ",".join(af_filters)]

    cmd += ["-c:a", codec, "-b:a", bitrate, "-ar", "44100", output_path]
    return cmd


def _run_audio_encoding(
    job_id: str,
    input_path: str,
    output_path: str,
    options: EncodingOptions,
    duration: float,
    trim_start: Optional[float] = None,
    trim_end: Optional[float] = None,
    normalize_loudness: bool = False,
    silence_trim: bool = False,
) -> None:
    job = job_manager.get_job(job_id)
    if not job:
        return
    job = job.model_copy(update={"status": "encoding"})
    job_manager.update_job(job)

    eff_duration = duration
    if trim_start is not None or trim_end is not None:
        start = trim_start or 0.0
        end = trim_end if trim_end is not None else duration
        eff_duration = max(end - start, 1.0)

    cmd = _build_audio_ffmpeg_cmd(
        input_path, output_path, options, trim_start, trim_end,
        normalize_loudness=normalize_loudness,
        silence_trim=silence_trim,
    )
    try:
        process = subprocess.Popen(cmd, stderr=subprocess.PIPE, universal_newlines=True)
        time_re = re.compile(r"time=(\d+):(\d+):(\d+\.\d+)")
        for line in process.stderr:  # type: ignore[union-attr]
            m = time_re.search(line)
            if m and eff_duration > 0:
                h, mi, s = m.groups()
                elapsed = int(h) * 3600 + int(mi) * 60 + float(s)
                progress = min(elapsed / eff_duration, 0.99)
                job = job.model_copy(update={"progress": progress})
                job_manager.update_job(job)
        process.wait()

        if process.returncode == 0:
            try:
                out_meta = probe_video_or_audio(output_path)
            except Exception:
                out_meta = None
            # Compute size stats
            orig_size = os.path.getsize(input_path) if os.path.isfile(input_path) else None
            comp_size = os.path.getsize(output_path) if os.path.isfile(output_path) else None
            pct_saved = round((1 - comp_size / orig_size) * 100, 1) if orig_size and comp_size and orig_size > 0 else None
            job = job.model_copy(update={
                "status": "done", "progress": 1.0, "output": out_meta,
                "original_size": orig_size, "compressed_size": comp_size, "percent_saved": pct_saved,
            })
        else:
            job = job.model_copy(update={"status": "failed", "error": "FFmpeg returned non-zero exit code."})
    except Exception as exc:
        job = job.model_copy(update={"status": "failed", "error": str(exc)})
    job_manager.update_job(job)


# ---------------------------------------------------------------------------
# Audio extraction from video (FFmpeg -vn)
# ---------------------------------------------------------------------------

def _run_audio_extraction(
    job_id: str,
    input_path: str,
    output_path: str,
    bitrate: str = "192k",
) -> None:
    """Extract the audio track from a video file to MP3."""
    job = job_manager.get_job(job_id)
    if not job:
        return
    job = job.model_copy(update={"status": "encoding", "progress": 0.05})
    job_manager.update_job(job)

    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-vn", "-c:a", "libmp3lame", "-b:a", bitrate,
        "-ar", "44100", output_path,
    ]
    try:
        process = subprocess.Popen(cmd, stderr=subprocess.PIPE, universal_newlines=True)
        process.wait()
        if process.returncode == 0:
            try:
                out_meta = probe_video_or_audio(output_path)
            except Exception:
                out_meta = None
            orig_size = os.path.getsize(input_path) if os.path.isfile(input_path) else None
            comp_size = os.path.getsize(output_path) if os.path.isfile(output_path) else None
            pct_saved = round((1 - comp_size / orig_size) * 100, 1) if orig_size and comp_size and orig_size > 0 else None
            job = job.model_copy(update={
                "status": "done", "progress": 1.0, "output": out_meta,
                "original_size": orig_size, "compressed_size": comp_size, "percent_saved": pct_saved,
            })
        else:
            job = job.model_copy(update={"status": "failed", "error": "Audio extraction failed."})
    except Exception as exc:
        job = job.model_copy(update={"status": "failed", "error": str(exc)})
    job_manager.update_job(job)


# ---------------------------------------------------------------------------
# Generic dispatcher
# ---------------------------------------------------------------------------

def start_encoding_async(
    job_id: str,
    input_path: str,
    output_path: str,
    options: EncodingOptions,
    duration: float,
    trim_start: Optional[float] = None,
    trim_end: Optional[float] = None,
    remove_audio: bool = False,
    normalize_loudness: bool = False,
    watermark_text: str = "",
    watermark_position: str = "bottomright",
    watermark_logo_path: str = "",
    extract_audio_only: bool = False,
    silence_trim: bool = False,
    edit_params: Optional[EditParams] = None,
) -> None:
    """Dispatch encoding to the correct handler in a background thread."""
    if extract_audio_only:
        t = threading.Thread(
            target=_run_audio_extraction,
            args=(job_id, input_path, output_path, "192k"),
            daemon=True,
        )
        t.start()
        return

    if options.mediaType == "video":
        t = threading.Thread(
            target=_run_video_encoding,
            args=(
                job_id, input_path, output_path, options, duration,
                trim_start, trim_end,
                remove_audio, normalize_loudness,
                watermark_text, watermark_position, watermark_logo_path,
                silence_trim,
                edit_params,
            ),
            daemon=True,
        )
    elif options.mediaType == "image":
        t = threading.Thread(
            target=_run_image_encoding,
            args=(job_id, input_path, output_path, options),
            daemon=True,
        )
    elif options.mediaType == "audio":
        t = threading.Thread(
            target=_run_audio_encoding,
            args=(
                job_id, input_path, output_path, options, duration,
                trim_start, trim_end,
                normalize_loudness, silence_trim,
            ),
            daemon=True,
        )
    else:
        raise ValueError(f"Unknown mediaType: {options.mediaType}")

    t.start()

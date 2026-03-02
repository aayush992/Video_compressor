"""
layout.py – Smart layout strategy and auto-quality logic.

Determines whether to crop, pad, or letterbox a video/image for a given
platform, and maps user-friendly quality labels (light/balanced/best) to
concrete FFmpeg / Pillow parameters.

When detection results are available (from detection.py), get_layout_strategy
computes a subject-aware crop region centred on detected faces/objects instead
of a blind centre-crop.
"""
from typing import Any, List, Optional
from .models import EncodingOptions

# ---------------------------------------------------------------------------
# Aspect-ratio helpers
# ---------------------------------------------------------------------------

_PLATFORM_ASPECT: dict = {
    # video
    "instagram_reels":  (9, 16),
    "tiktok":           (9, 16),
    "youtube_shorts":   (9, 16),
    "facebook_reels":   (9, 16),
    "twitter_video":    (16, 9),
    "youtube_landscape":(16, 9),
    # image
    "instagram_post":   (1, 1),
    "facebook_profile": (1, 1),
    "x_post":           (16, 9),
}

_PLATFORM_LABEL: dict = {
    "instagram_reels":   "9:16",
    "tiktok":            "9:16",
    "youtube_shorts":    "9:16",
    "facebook_reels":    "9:16",
    "twitter_video":     "16:9",
    "youtube_landscape": "16:9",
    "instagram_post":    "1:1",
    "facebook_profile":  "1:1",
    "x_post":            "16:9",
}


def _aspect_float(w: int, h: int) -> float:
    return w / h if h != 0 else 1.0


def get_target_aspect(platform: str) -> Optional[str]:
    """Return the friendly aspect string like '9:16' for a platform."""
    return _PLATFORM_LABEL.get(platform)


# ---------------------------------------------------------------------------
# Smart crop helpers
# ---------------------------------------------------------------------------

def _center_crop_region(
    source_w: int,
    source_h: int,
    target_ratio: float,
) -> dict:
    """Blind centre-crop (no detection).  Returns normalised {x,y,w,h}."""
    source_ratio = source_w / source_h
    if source_ratio > target_ratio:
        crop_w = source_h * target_ratio
        crop_h = source_h
        return {
            "x": (source_w - crop_w) / 2 / source_w,
            "y": 0.0,
            "w": crop_w / source_w,
            "h": 1.0,
        }
    else:
        crop_h = source_w / target_ratio
        return {
            "x": 0.0,
            "y": (source_h - crop_h) / 2 / source_h,
            "w": 1.0,
            "h": crop_h / source_h,
        }


def _smart_crop_region(
    detections: List[Any],
    source_w: int,
    source_h: int,
    target_ratio: float,
    context_padding: float = 0.15,
) -> dict:
    """
    Subject-aware crop centred on the union of detected faces/objects.
    Uses the Detection dataclass from detection.py (duck-typed here).
    Falls back to centre-crop if the maths goes wrong.
    """
    try:
        # Union bounding box of all detections
        min_x = min(d.x for d in detections)
        min_y = min(d.y for d in detections)
        max_x = max(d.x + d.w for d in detections)
        max_y = max(d.y + d.h for d in detections)

        cx = (min_x + max_x) / 2   # focus centroid X (normalised)
        cy = (min_y + max_y) / 2   # focus centroid Y (normalised)

        # Subject region with context padding
        fw = (max_x - min_x) * (1 + context_padding)
        fh = (max_y - min_y) * (1 + context_padding)
        fw = max(fw, 0.20)
        fh = max(fh, 0.20)

        # Compute crop dimensions (pixels) to match target_ratio
        # Start from whichever axis the focus region is already largest in
        crop_w_px = fw * source_w
        crop_h_px = crop_w_px / target_ratio

        if crop_h_px < fh * source_h:
            crop_h_px = fh * source_h
            crop_w_px = crop_h_px * target_ratio

        # Clamp to source size
        if crop_w_px > source_w:
            crop_w_px = source_w
            crop_h_px = crop_w_px / target_ratio
        if crop_h_px > source_h:
            crop_h_px = source_h
            crop_w_px = crop_h_px * target_ratio

        # Centre on focus; clamp to source bounds
        x_px = cx * source_w - crop_w_px / 2
        y_px = cy * source_h - crop_h_px / 2
        x_px = max(0.0, min(float(source_w) - crop_w_px, x_px))
        y_px = max(0.0, min(float(source_h) - crop_h_px, y_px))

        return {
            "x": x_px / source_w,
            "y": y_px / source_h,
            "w": crop_w_px / source_w,
            "h": crop_h_px / source_h,
        }
    except Exception:
        return _center_crop_region(source_w, source_h, target_ratio)


# ---------------------------------------------------------------------------
# Main layout strategy
# ---------------------------------------------------------------------------

def get_layout_strategy(
    input_width: int,
    input_height: int,
    platform: str,
    user_preference: Optional[str] = None,   # "crop" | "pad" | None
    detections: Optional[List[Any]] = None,  # List[Detection] from detection.py
    detection_mode: str = "none",            # "mediapipe" | "yolo" | "none"
) -> dict:
    """
    Decide crop vs pad and return layout metadata.

    When *detections* are provided the crop region is centred on the
    detected faces/objects instead of a blind centre-crop.

    Returns a dict with:
      mode           – "crop" | "pad" | "none"
      targetAspect   – e.g. "9:16"
      safeAreaNote   – human-readable hint for the user
      backgroundType – "blur" | "black" | "none"
      cropRegion     – {x, y, w, h} as fractions (0-1) when mode=="crop"
      detections     – list of normalised detection boxes for canvas overlay
      detectionMode  – which backend was used
    """
    det_list = detections or []

    # Serialise detections for the API response / canvas overlay
    det_payload = [
        {
            "label": d.label,
            "confidence": round(d.confidence, 3),
            "x": round(d.x, 4), "y": round(d.y, 4),
            "w": round(d.w, 4), "h": round(d.h, 4),
        }
        for d in det_list
    ]

    target = _PLATFORM_ASPECT.get(platform)
    if target is None or input_width == 0 or input_height == 0:
        return {
            "mode": "none",
            "targetAspect": None,
            "safeAreaNote": "No layout change needed.",
            "backgroundType": "none",
            "cropRegion": None,
            "detections": det_payload,
            "detectionMode": detection_mode,
        }

    tw, th = target
    target_ratio  = tw / th
    source_ratio  = _aspect_float(input_width, input_height)
    target_label  = f"{tw}:{th}"

    # Already matching aspect ratio (within 2 %)
    if abs(source_ratio - target_ratio) < 0.02:
        return {
            "mode": "none",
            "targetAspect": target_label,
            "safeAreaNote": "Aspect ratio already matches – no cropping or padding needed.",
            "backgroundType": "none",
            "cropRegion": None,
            "detections": det_payload,
            "detectionMode": detection_mode,
        }

    # Decide mode
    if user_preference in ("crop", "pad"):
        mode = user_preference
    else:
        # When faces/objects detected: prefer crop so subjects fill the frame.
        # When nothing detected and aspect flip is extreme: pad to be safe.
        if det_list:
            mode = "crop"
        elif (source_ratio > 1.2 and target_ratio < 0.9) or (source_ratio < 0.9 and target_ratio > 1.2):
            mode = "pad"
        else:
            mode = "crop"

    if mode == "crop":
        if det_list:
            crop_region = _smart_crop_region(
                det_list, input_width, input_height, target_ratio
            )
            subject_labels = ", ".join(
                sorted({d.label for d in det_list})
            )
            note = (
                f"{len(det_list)} subject(s) detected ({subject_labels}) via {detection_mode}. "
                f"Crop centred on detected region to fit {target_label}."
            )
        else:
            crop_region = _center_crop_region(input_width, input_height, target_ratio)
            if source_ratio > target_ratio:
                note = (
                    f"No subjects detected. Source is wider ({input_width}×{input_height}). "
                    f"Centre-cropping left/right to fit {target_label}."
                )
            else:
                note = (
                    f"No subjects detected. Source is taller ({input_width}×{input_height}). "
                    f"Centre-cropping top/bottom to fit {target_label}."
                )

        return {
            "mode": "crop",
            "targetAspect": target_label,
            "safeAreaNote": note,
            "backgroundType": "none",
            "cropRegion": crop_region,
            "detections": det_payload,
            "detectionMode": detection_mode,
        }

    else:  # pad
        if det_list:
            note = (
                f"{len(det_list)} subject(s) detected. "
                f"Padding to {target_label} to keep full frame visible."
            )
        else:
            note = (
                f"No subjects detected. Padding to {target_label} with blurred background."
            )
        return {
            "mode": "pad",
            "targetAspect": target_label,
            "safeAreaNote": note,
            "backgroundType": "blur",
            "cropRegion": None,
            "detections": det_payload,
            "detectionMode": detection_mode,
        }


# ---------------------------------------------------------------------------
# Quality presets
# ---------------------------------------------------------------------------

QUALITY_PRESETS = {
    # crf:   lower = better quality / larger file
    #        28-30 for light (small file priority), 24-26 balanced, 20-22 best
    # bitrate used as -maxrate cap only (prevents scene-complexity bloat),
    #         NOT as a target — CRF is the driver.
    "light":    {"crf": 30, "bitrate": "3M",  "image_quality": 65,  "audio_bitrate": "96k"},
    "balanced": {"crf": 26, "bitrate": "6M",  "image_quality": 78,  "audio_bitrate": "128k"},
    "best":     {"crf": 22, "bitrate": "12M", "image_quality": 88,  "audio_bitrate": "192k"},
}

# Estimated output sizes in MB per minute of video (rough heuristic, CRF-based)
_VIDEO_MB_PER_MIN = {"light": 22, "balanced": 45, "best": 90}
_IMAGE_KB = {"light": 80, "balanced": 200, "best": 500}
_AUDIO_MB_PER_MIN = {"light": 0.7, "balanced": 1.0, "best": 1.5}


def estimate_output_size(
    media_type: str,
    quality: str,
    duration_seconds: float = 0,
) -> str:
    """Return a human-readable estimated output size string."""
    q = quality if quality in QUALITY_PRESETS else "balanced"
    if media_type == "video" and duration_seconds:
        mb = _VIDEO_MB_PER_MIN[q] * (duration_seconds / 60)
        return f"~{mb:.0f} MB"
    if media_type == "image":
        return f"~{_IMAGE_KB[q]} KB"
    if media_type == "audio" and duration_seconds:
        mb = _AUDIO_MB_PER_MIN[q] * (duration_seconds / 60)
        return f"~{mb:.1f} MB"
    return "Unknown"


def suggest_platform(
    width: int,
    height: int,
    duration: float,
    media_type: str,
) -> list:
    """
    Return an ordered list of platform suggestions based on video/image dimensions.
    Each entry: {"platform": str, "label": str, "reason": str}
    """
    suggestions = []

    if media_type == "audio":
        return [
            {"platform": "podcast", "label": "Podcast / Audio", "reason": "Audio content — optimised for speech/music."},
        ]

    if width == 0 or height == 0:
        return []

    ratio = width / height

    if media_type == "video":
        if ratio > 1.5:   # landscape / wide
            suggestions = [
                {"platform": "youtube_landscape", "label": "YouTube",       "reason": "Wide 16:9 — perfect for YouTube landscape."},
                {"platform": "twitter_video",     "label": "Twitter / X",   "reason": "16:9 works great for Twitter/X."},
            ]
        elif ratio < 0.67:  # tall / portrait
            suggestions = [
                {"platform": "tiktok",          "label": "TikTok",           "reason": "Tall 9:16 — ideal for TikTok full-screen."},
                {"platform": "instagram_reels", "label": "Instagram Reels",  "reason": "9:16 is the native Instagram Reels format."},
                {"platform": "youtube_shorts",  "label": "YouTube Shorts",   "reason": "9:16 is the YouTube Shorts format."},
                {"platform": "facebook_reels",  "label": "Facebook Reels",   "reason": "9:16 matches Facebook Reels."},
            ]
        else:  # close to square
            suggestions = [
                {"platform": "instagram_post",  "label": "Instagram Post",   "reason": "Near-square — great for Instagram square posts."},
                {"platform": "x_post",          "label": "X / Twitter Post", "reason": "Square format works well on X."},
            ]
    else:  # image
        if ratio > 1.5:
            suggestions = [
                {"platform": "x_post",            "label": "X / Twitter Post", "reason": "Landscape images look great on X."},
                {"platform": "youtube_landscape",  "label": "YouTube Thumbnail","reason": "Wide format suits YouTube thumbnails."},
            ]
        elif ratio < 0.67:
            suggestions = [
                {"platform": "instagram_reels", "label": "Instagram Story/Reel", "reason": "Tall images suit Stories/Reels."},
            ]
        else:
            suggestions = [
                {"platform": "instagram_post",  "label": "Instagram Post",  "reason": "Square format is perfect for Instagram."},
                {"platform": "facebook_profile","label": "Facebook Profile","reason": "Square is ideal for profile photos."},
            ]

    return suggestions


def choose_encoding_options(
    platform: str,
    quality: str,           # "light" | "balanced" | "best"
    media_type: str,        # "video" | "image" | "audio"
    layout_mode: str = "crop",  # "crop" | "pad" | "none"
    device_class: str = "desktop",
) -> EncodingOptions:
    """
    Build an EncodingOptions object from a platform, quality label, and layout mode.
    Loads the platform preset for resolution/fps, then applies quality overrides.
    """
    # Import lazily to avoid circular imports
    from .schemas import get_preset_by_platform

    preset = get_preset_by_platform(platform, media_type)
    qp = QUALITY_PRESETS.get(quality, QUALITY_PRESETS["balanced"])

    if media_type == "video":
        return EncodingOptions(
            platform=platform,
            resolution=preset.get("resolution"),
            codec=preset.get("codec", "h264"),
            fps=preset.get("fps", 30),
            bitrate=qp["bitrate"],
            crf=qp["crf"],
            aspectMode=layout_mode if layout_mode != "none" else preset.get("aspectMode", "crop"),
            deviceClass=device_class,
            mediaType=media_type,
        )
    elif media_type == "image":
        return EncodingOptions(
            platform=platform,
            resolution=preset.get("resolution"),
            codec=preset.get("codec", "jpg"),
            crf=qp["image_quality"],
            aspectMode=layout_mode if layout_mode != "none" else preset.get("aspectMode", "crop"),
            deviceClass=device_class,
            mediaType=media_type,
        )
    else:  # audio
        return EncodingOptions(
            platform=platform,
            codec=preset.get("codec", "mp3"),
            bitrate=qp["audio_bitrate"],
            deviceClass=device_class,
            mediaType=media_type,
        )

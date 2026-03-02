"""
detection.py – Face and object detection for smart-crop layout.

Two backends tried in order:
  1. MediaPipe Face Detection – fast, CPU-only face detector
  2. YOLOv8s via ultralytics   – general object detection (heavier,
                                  auto-downloads ~22 MB weights on first use)

If neither package is installed the module returns [] so layout.py falls
back to safe centre-crop or pad automatically.
"""
import os
import subprocess
import tempfile
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class Detection:
    label: str            # "face", "person", "car", …
    confidence: float     # 0–1
    # Normalised bounding box (0–1 relative to source image W × H)
    x: float              # left edge
    y: float              # top edge
    w: float              # width
    h: float              # height


# ---------------------------------------------------------------------------
# Frame extraction from video
# ---------------------------------------------------------------------------

def extract_frame(video_path: str, time_sec: float = 1.0) -> Optional[str]:
    """Extract one frame from *video_path* using FFmpeg → temp JPEG."""
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    tmp.close()
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(time_sec),
        "-i", video_path,
        "-frames:v", "1",
        "-q:v", "2",
        tmp.name,
    ]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode == 0 and os.path.isfile(tmp.name) and os.path.getsize(tmp.name) > 0:
        return tmp.name
    try:
        os.unlink(tmp.name)
    except OSError:
        pass
    return None


# ---------------------------------------------------------------------------
# Backend 1 – MediaPipe Face Detection
# ---------------------------------------------------------------------------

def _detect_mediapipe(image_path: str) -> List[Detection]:
    """Returns face detections via MediaPipe, or [] if not installed."""
    try:
        import mediapipe as mp          # type: ignore[import]
        import numpy as np
        from PIL import Image as PILImage

        img   = PILImage.open(image_path).convert("RGB")
        img_np = np.array(img)

        mp_fd = mp.solutions.face_detection
        with mp_fd.FaceDetection(model_selection=1, min_detection_confidence=0.40) as detector:
            result = detector.process(img_np)

        detections: List[Detection] = []
        if result.detections:
            for det in result.detections:
                bb = det.location_data.relative_bounding_box
                x = max(0.0, float(bb.xmin))
                y = max(0.0, float(bb.ymin))
                w = min(float(bb.width),  1.0 - x)
                h = min(float(bb.height), 1.0 - y)
                if w > 0.01 and h > 0.01:
                    detections.append(Detection(
                        label="face",
                        confidence=float(det.score[0]),
                        x=x, y=y, w=w, h=h,
                    ))
        return detections
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Backend 2 – YOLOv8s (ultralytics)
# ---------------------------------------------------------------------------

# Labels preferred for subject-aware smart-crop
_SUBJECT_LABELS = {
    "person", "face",
    "cat", "dog", "bird",
    "car", "bicycle", "motorcycle", "bus", "truck",
    "sports ball", "tennis racket", "skateboard",
}


def _detect_yolo(image_path: str) -> List[Detection]:
    """Returns YOLO detections, or [] if ultralytics is not installed."""
    try:
        from ultralytics import YOLO    # type: ignore[import]

        model   = YOLO("yolov8s.pt")   # auto-downloads weights on first call
        results = model(image_path, verbose=False)[0]

        detections: List[Detection] = []
        for box in results.boxes:
            label = results.names[int(box.cls)]
            conf  = float(box.conf)
            if conf < 0.35:
                continue
            x1, y1, x2, y2 = [float(v) for v in box.xyxyn[0].tolist()]
            detections.append(Detection(
                label=label,
                confidence=conf,
                x=x1, y=y1, w=x2 - x1, h=y2 - y1,
            ))

        # Sort: subject labels first, then by area descending
        detections.sort(
            key=lambda d: (d.label not in _SUBJECT_LABELS, -(d.w * d.h))
        )
        return detections
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect(image_path: str) -> tuple[List[Detection], str]:
    """
    Run MediaPipe face detection first; fall back to YOLOv8s if no faces.
    Returns (detections, backend_name) where backend_name is one of
    "mediapipe", "yolo", or "none".
    """
    faces = _detect_mediapipe(image_path)
    if faces:
        return faces, "mediapipe"
    objs = _detect_yolo(image_path)
    if objs:
        return objs, "yolo"
    return [], "none"


def detect_from_video(
    video_path: str,
    duration: float = 0.0,
) -> tuple[List[Detection], str]:
    """
    Extract a representative frame from a video, then run detect().
    Seeks to 25 % of duration (or 1 s if duration unknown).
    """
    seek = min(1.0, max(0.1, duration * 0.25)) if duration > 0 else 1.0
    frame = extract_frame(video_path, seek) or extract_frame(video_path, 0.5)
    if not frame:
        return [], "none"
    try:
        return detect(frame)
    finally:
        try:
            os.unlink(frame)
        except OSError:
            pass

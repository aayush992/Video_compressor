from typing import Optional, Union
from pydantic import BaseModel


class User(BaseModel):
    id: str
    email: str
    google_id: str = ""
    created_at: str = ""


class MediaMetadata(BaseModel):
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[int] = None
    duration: Optional[float] = None        # seconds (video / audio)
    codec: str
    audioChannels: Optional[int] = None
    bitDepth: Optional[int] = None          # for images
    channels: Optional[int] = None          # for images (RGB=3, RGBA=4)
    mime_type: str = "application/octet-stream"
    originalPath: str


class EncodingOptions(BaseModel):
    platform: str
    resolution: Optional[str] = None        # "1080x1920" for video/image
    codec: str                              # "h264","h265","av1","jpg","webp","mp3","opus"
    fps: Optional[int] = None
    bitrate: Optional[str] = None           # "20M", "128k"
    crf: Optional[int] = None
    aspectMode: Optional[str] = None        # "crop", "pad", "letterbox"
    deviceClass: str = "desktop"            # "desktop", "mobile"
    mediaType: str                          # "video", "image", "audio"


class Job(BaseModel):
    id: str
    status: str                             # "pending", "encoding", "done", "failed"
    progress: float
    error: Optional[str] = None
    input: Optional[MediaMetadata] = None
    output: Optional[MediaMetadata] = None
    # Auth / ownership
    user_id: Optional[str] = None
    # Output file info
    output_filename: Optional[str] = None
    platform: Optional[str] = None
    quality: Optional[str] = None
    media_type: Optional[str] = None
    # Stats
    original_size: Optional[int] = None     # bytes
    compressed_size: Optional[int] = None   # bytes
    percent_saved: Optional[float] = None   # 0-100
    created_at: Optional[str] = None
    completed_at: Optional[str] = None
    # File paths / cloud URLs (internal use + API response)
    inputPath: Optional[str] = None
    outputPath: Optional[str] = None
    inputUrl: Optional[str] = None          # Cloudinary URL for input
    outputUrl: Optional[str] = None         # Cloudinary URL for output
    inputMetadata: Optional[dict] = None
    inputSize: Optional[float] = None
    outputSize: Optional[float] = None


class LayoutOptions(BaseModel):
    mode: str = "crop"                      # "crop" | "pad" | "none"
    safeAreaPreference: str = "center"      # "center" | "top" | "bottom"
    backgroundType: str = "blur"            # "blur" | "black"


class CropParams(BaseModel):
    """Pixel-accurate crop region for a video or image."""
    w: int
    h: int
    x: int = 0
    y: int = 0


class EditParams(BaseModel):
    """Edit transformations applied (by FFmpeg) before the main encode."""
    crop: Optional[CropParams] = None
    rotate: Optional[int] = None   # 90 | 180 | 270  (degrees clockwise)
    flipH: bool = False             # horizontal flip
    flipV: bool = False             # vertical flip
    fixOrientation: bool = False    # strip/zero rotation metadata


class StartJobRequest(BaseModel):
    inputPath: str
    outputPath: str = ""
    platform: str
    mediaType: str                          # "video", "image", "audio"
    deviceClass: str = "desktop"
    quality: str = "balanced"               # "light" | "balanced" | "best"
    layoutOptions: Optional[LayoutOptions] = None
    # Trim support (seconds, video + audio only)
    trimStart: Optional[float] = None
    trimEnd: Optional[float] = None
    # Audio options (video only)
    removeAudio: bool = False
    normalizeLoudness: bool = False
    # Watermark options
    watermarkText: str = ""
    watermarkPosition: str = "bottomright"  # "bottomright"|"bottomleft"|"topleft"|"topright"|"center"
    watermarkLogoPath: str = ""             # server-side path to a logo image
    # Special job modes
    extractAudioOnly: bool = False          # extract audio track → MP3/Opus
    silenceTrim: bool = False               # trim leading/trailing silence
    # Edit / transform step (crop, rotate, flip)
    edit: Optional[EditParams] = None


class AnalyzeRequest(BaseModel):
    path: str


class UserPreset(BaseModel):
    name: str
    platform: str
    quality: str = "balanced"
    layoutMode: str = "crop"
    removeAudio: bool = False
    normalizeLoudness: bool = False
    watermarkText: str = ""
    watermarkPosition: str = "bottomright"


class PreviewEditRequest(BaseModel):
    """Request body for POST /jobs/preview-edit."""
    inputPath: str
    edit: EditParams
    previewDuration: float = 5.0

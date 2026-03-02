"""
storage.py – File storage helpers.

Local dev: files live in backend/uploads/ and backend/processed/
Production (Render): set CLOUDINARY_URL env var to enable Cloudinary storage.
  Files are still written to local disk (FFmpeg needs a writable path), then
  uploaded to Cloudinary after encoding completes.

  CLOUDINARY_URL format: cloudinary://<api_key>:<api_secret>@<cloud_name>
"""
import os
from typing import Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Local path helpers (always available)
# ---------------------------------------------------------------------------

def get_upload_path(filename: str) -> str:
    return os.path.join(UPLOADS_DIR, filename)


def get_processed_path(filename: str) -> str:
    return os.path.join(PROCESSED_DIR, filename)


# ---------------------------------------------------------------------------
# Cloudinary helpers (only active when CLOUDINARY_URL is set)
# ---------------------------------------------------------------------------

def _cloudinary_configured() -> bool:
    return bool(os.getenv("CLOUDINARY_URL", "").strip())


def upload_to_cloud(local_path: str, public_id: Optional[str] = None, resource_type: str = "auto") -> Optional[str]:
    """
    Upload a local file to Cloudinary and return the secure URL.
    Returns None if CLOUDINARY_URL is not set or the upload fails.
    """
    if not _cloudinary_configured():
        return None
    try:
        import cloudinary  # type: ignore[import]
        import cloudinary.uploader  # type: ignore[import]

        # cloudinary SDK auto-reads CLOUDINARY_URL from env
        opts: dict = {"resource_type": resource_type, "overwrite": True}
        if public_id:
            opts["public_id"] = public_id

        result = cloudinary.uploader.upload(local_path, **opts)
        return result.get("secure_url") or result.get("url")
    except Exception:
        return None


def upload_processed(local_path: str, filename: str) -> Optional[str]:
    """Upload a processed/output file; returns Cloudinary URL or None."""
    public_id = f"media_compressor/processed/{os.path.splitext(filename)[0]}"
    return upload_to_cloud(local_path, public_id=public_id)


def upload_input(local_path: str, filename: str) -> Optional[str]:
    """Upload an input/upload file; returns Cloudinary URL or None."""
    public_id = f"media_compressor/uploads/{os.path.splitext(filename)[0]}"
    return upload_to_cloud(local_path, public_id=public_id)

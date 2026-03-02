"""
main.py – FastAPI entrypoint for the Media Compressor API.

Local dev (from project root):
    uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

Render (production – run from project root, NOT inside backend/):
    Build:  pip install -r backend/requirements.txt
    Start:  uvicorn backend.main:app --host 0.0.0.0 --port $PORT
"""
import uuid
import os
import io
import zipfile
import mimetypes
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .models import (
    Job,
    StartJobRequest,
    AnalyzeRequest,
    MediaMetadata,
    UserPreset,
    PreviewEditRequest,
)
from .schemas import load_all_presets, load_flat_presets, get_preset_by_platform
from . import jobs as job_manager
from .encoding import analyze_any, start_encoding_async, run_preview_edit
from .storage import get_upload_path, get_processed_path
from .layout import get_layout_strategy, choose_encoding_options, estimate_output_size, QUALITY_PRESETS, suggest_platform
from .detection import detect, detect_from_video
from .auth import (
    register_user, authenticate_user, get_or_create_google_user,
    create_access_token, get_current_user, verify_google_token,
)
from .database import get_db, init_db

app = FastAPI(title="Media Compressor API", version="2.0.0")


@app.on_event("startup")
def on_startup():
    init_db()

# ---------------------------------------------------------------------------
# CORS – allow local React dev server + Vercel deployment
# Set ALLOWED_ORIGIN env var to your Vercel URL in production.
# ---------------------------------------------------------------------------
_extra = os.getenv("ALLOWED_ORIGIN", "").strip()
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",          # Vite dev
    *([_extra] if _extra else []),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_EXT_TO_MEDIA_TYPE = {
    # video
    ".mp4": "video", ".mov": "video", ".avi": "video", ".mkv": "video",
    ".webm": "video", ".flv": "video", ".wmv": "video",
    # image
    ".jpg": "image", ".jpeg": "image", ".png": "image", ".gif": "image",
    ".bmp": "image", ".webp": "image", ".tiff": "image", ".tif": "image",
    # audio
    ".mp3": "audio", ".wav": "audio", ".aac": "audio", ".m4a": "audio",
    ".ogg": "audio", ".opus": "audio", ".flac": "audio",
}

def _detect_media_type(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    return _EXT_TO_MEDIA_TYPE.get(ext, "video")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {"status": "ok", "message": "Media Compressor API is running."}


# ---------------------------------------------------------------------------
# Presets  – grouped by mediaType
# ---------------------------------------------------------------------------

@app.get("/presets")
def list_presets():
    """Return all platform presets grouped by mediaType."""
    try:
        return load_all_presets()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Analyze – auto-detect media type
# ---------------------------------------------------------------------------

@app.post("/analyze")
def analyze_file(body: AnalyzeRequest) -> MediaMetadata:
    """Analyse any file (video, image, audio) and return metadata."""
    if not os.path.isfile(body.path):
        raise HTTPException(status_code=404, detail=f"File not found: {body.path}")
    try:
        return analyze_any(body.path)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Accept a multipart file upload and stream it to uploads/ in 1 MB chunks."""
    filename = file.filename or "upload"
    # Prefix with a short UUID so duplicate filenames never collide
    safe_name = f"{uuid.uuid4().hex[:8]}_{filename}"
    dest_path = get_upload_path(safe_name)

    # Stream in 1 MB chunks – avoids buffering the entire file in RAM
    CHUNK = 1024 * 1024  # 1 MB
    with open(dest_path, "wb") as dest:
        while True:
            chunk = await file.read(CHUNK)
            if not chunk:
                break
            dest.write(chunk)

    # Auto-analyse after upload
    try:
        metadata = analyze_any(dest_path)
    except Exception:
        metadata = None

    return {
        "filename": safe_name,
        "path": dest_path,
        "mediaType": _detect_media_type(dest_path),
        "metadata": metadata,
    }


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------

@app.post("/jobs")
def start_job(body: StartJobRequest, authorization: str = Header(default=""), db: Session = Depends(get_db)) -> Job:
    """Create and start a new encoding job (video, image, or audio)."""
    if not os.path.isfile(body.inputPath):
        raise HTTPException(status_code=404, detail=f"Input file not found: {body.inputPath}")

    # Optional auth — attach user_id if a valid token is provided
    user_id: Optional[str] = None
    if authorization.startswith("Bearer "):
        try:
            user = get_current_user(authorization)
            user_id = user["id"]
        except HTTPException:
            pass  # Anonymous jobs are fine

    media_type = body.mediaType or _detect_media_type(body.inputPath)

    # Resolve layout mode from layoutOptions or default crop
    layout_mode = "crop"
    if body.layoutOptions:
        layout_mode = body.layoutOptions.mode

    # Build EncodingOptions using quality preset + platform
    options = choose_encoding_options(
        platform=body.platform,
        quality=body.quality or "balanced",
        media_type=media_type,
        layout_mode=layout_mode,
        device_class=body.deviceClass,
    )

    # Probe input
    try:
        input_meta = analyze_any(body.inputPath)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not analyse input: {exc}")

    # Determine output extension
    ext_map = {
        "video": ".mp4",
        "image": ".webp" if options.codec == "webp" else ".jpg",
        "audio": ".opus" if options.codec == "opus" else ".mp3",
    }
    if body.extractAudioOnly:
        out_ext = ".mp3"
    else:
        out_ext = ext_map.get(media_type, ".mp4")
    job_id = str(uuid.uuid4())[:8]
    output_filename = f"{job_id}_output{out_ext}"
    output_path = body.outputPath or get_processed_path(output_filename)

    # Create job record
    job = Job(
        id=job_id,
        status="pending",
        progress=0.0,
        input=input_meta,
        user_id=user_id,
        platform=body.platform,
        quality=body.quality or "balanced",
        media_type=media_type,
        output_filename=output_filename,
        outputPath=output_path,          # persist so GET /jobs/{id} can return the filename
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    job_manager.create_job(job, db)

    # Start async encoding (pass all params)
    start_encoding_async(
        job_id=job_id,
        input_path=body.inputPath,
        output_path=output_path,
        options=options,
        duration=input_meta.duration or 0.0,
        trim_start=body.trimStart,
        trim_end=body.trimEnd,
        remove_audio=body.removeAudio,
        normalize_loudness=body.normalizeLoudness,
        watermark_text=body.watermarkText,
        watermark_position=body.watermarkPosition,
        watermark_logo_path=body.watermarkLogoPath,
        extract_audio_only=body.extractAudioOnly,
        silence_trim=body.silenceTrim,
        edit_params=body.edit,
    )

    return job_manager.get_job(job_id, db)  # type: ignore[return-value]


@app.post("/jobs/preview-edit")
def preview_edit_endpoint(body: PreviewEditRequest):
    """Generate a short preview clip (default 5 s) with edit transforms applied."""
    if not os.path.isfile(body.inputPath):
        raise HTTPException(status_code=404, detail=f"File not found: {body.inputPath}")
    preview_id = str(uuid.uuid4())[:8]
    preview_path = get_processed_path(f"preview_{preview_id}.mp4")
    try:
        run_preview_edit(body.inputPath, body.edit, preview_path, body.previewDuration)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return {
        "previewPath": preview_path,
        "previewFilename": os.path.basename(preview_path),
    }


@app.get("/jobs/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)) -> Job:
    job = job_manager.get_job(job_id, db)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
    return job


@app.get("/jobs")
def list_jobs(db: Session = Depends(get_db)):
    return job_manager.list_jobs(db)


# ---------------------------------------------------------------------------
# Download processed file
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Layout strategy helper endpoint
# ---------------------------------------------------------------------------

class _LayoutRequest(BaseModel):
    inputPath: str
    platform: str
    userPreference: str = ""    # "crop" | "pad" | ""


@app.post("/layout-strategy")
def layout_strategy(body: _LayoutRequest):
    """Analyse source dimensions + run face/object detection, return layout recommendation."""
    if not os.path.isfile(body.inputPath):
        raise HTTPException(status_code=404, detail=f"File not found: {body.inputPath}")
    try:
        meta = analyze_any(body.inputPath)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    w = meta.width or 0
    h = meta.height or 0
    pref = body.userPreference if body.userPreference in ("crop", "pad") else None

    # --- Run detection on a representative frame / image ---
    media_type = _detect_media_type(body.inputPath)
    try:
        if media_type == "video":
            detections, det_mode = detect_from_video(body.inputPath, meta.duration or 0.0)
        elif media_type == "image":
            detections, det_mode = detect(body.inputPath)
        else:
            detections, det_mode = [], "none"
    except Exception:
        detections, det_mode = [], "none"

    strategy = get_layout_strategy(w, h, body.platform, pref, detections, det_mode)

    # Attach file-size estimates for all quality levels
    strategy["sizeEstimates"] = {
        q: estimate_output_size(meta.mime_type.split("/")[0], q, meta.duration or 0)
        for q in QUALITY_PRESETS
    }
    strategy["sourceSize"] = {"width": w, "height": h, "duration": meta.duration}
    return strategy


@app.get("/download/{filename}")
def download_file(filename: str):
    # Strip directory components to prevent path traversal
    safe_name = os.path.basename(filename)
    if not safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename.")
    path = get_processed_path(safe_name)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail=f"File not found: {safe_name}")
    try:
        mime, _ = mimetypes.guess_type(safe_name)
        return FileResponse(path, media_type=mime or "application/octet-stream", filename=safe_name)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to serve file: {exc}")


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------

class _RegisterRequest(BaseModel):
    email: str
    password: str


class _LoginRequest(BaseModel):
    email: str
    password: str


class _GoogleRequest(BaseModel):
    tokenId: str


@app.post("/auth/register")
def auth_register(body: _RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user with email + password."""
    try:
        user = register_user(body.email, body.password, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    token = create_access_token(user["id"], user["email"])
    return {"access_token": token, "token_type": "bearer"}


@app.post("/auth/login")
def auth_login(body: _LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email + password, return JWT."""
    try:
        user = authenticate_user(body.email, body.password, db)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    token = create_access_token(user["id"], user["email"])
    return {"access_token": token, "token_type": "bearer"}


@app.post("/auth/google")
def auth_google(body: _GoogleRequest, db: Session = Depends(get_db)):
    """Verify Google OAuth2 tokenId and return JWT."""
    try:
        idinfo = verify_google_token(body.tokenId)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    email = idinfo.get("email", "")
    google_id = idinfo.get("sub", "")
    user = get_or_create_google_user(email, google_id, db)
    token = create_access_token(user["id"], user["email"])
    return {"access_token": token, "token_type": "bearer"}


@app.get("/auth/me")
def auth_me(current_user: dict = Depends(get_current_user)):
    """Return current user info."""
    return {"id": current_user["id"], "email": current_user["email"]}


# ---------------------------------------------------------------------------
# Job history (requires auth)
# ---------------------------------------------------------------------------

@app.get("/history")
def get_history(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return all jobs for the authenticated user, newest first."""
    return job_manager.get_jobs_by_user(current_user["id"], db)


# ---------------------------------------------------------------------------
# ZIP download
# ---------------------------------------------------------------------------

class _ZipRequest(BaseModel):
    filenames: List[str]


@app.post("/download/zip")
def download_zip(body: _ZipRequest):
    """Stream a ZIP archive containing the requested processed files."""
    if not body.filenames:
        raise HTTPException(status_code=400, detail="No filenames provided.")

    try:
        buf = io.BytesIO()
        added = 0
        missing: list[str] = []
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for filename in body.filenames:
                # Security: strip any directory components
                safe_name = os.path.basename(filename)
                if not safe_name:
                    continue
                path = get_processed_path(safe_name)
                if os.path.isfile(path):
                    try:
                        zf.write(path, safe_name)
                        added += 1
                    except Exception as file_exc:
                        missing.append(f"{safe_name} ({file_exc})")
                else:
                    missing.append(safe_name)
        if added == 0:
            detail = "None of the requested files were found."
            if missing:
                detail += " Missing: " + ", ".join(missing[:5])
            raise HTTPException(status_code=404, detail=detail)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=compressed_files.zip"},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create ZIP archive: {exc}")


# ---------------------------------------------------------------------------
# Platform suggestion
# ---------------------------------------------------------------------------

class _SuggestRequest(BaseModel):
    inputPath: str


@app.post("/suggest-platform")
def suggest_platform_route(body: _SuggestRequest):
    """Analyse a file and return sorted platform suggestions."""
    if not os.path.isfile(body.inputPath):
        raise HTTPException(status_code=404, detail=f"File not found: {body.inputPath}")
    try:
        meta = analyze_any(body.inputPath)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    media_type = _detect_media_type(body.inputPath)
    suggestions = suggest_platform(
        width=meta.width or 0,
        height=meta.height or 0,
        duration=meta.duration or 0.0,
        media_type=media_type,
    )
    return {"suggestions": suggestions}


# ---------------------------------------------------------------------------
# User presets (DB-backed via UserPresetRow)
# ---------------------------------------------------------------------------

from .database import UserPresetRow  # noqa: E402
import json as _json


@app.post("/user-presets")
def save_user_preset(preset: UserPreset, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user["id"]
    # Delete existing row with same name (upsert)
    db.query(UserPresetRow).filter(UserPresetRow.user_id == uid, UserPresetRow.name == preset.name).delete()
    row = UserPresetRow(
        id=str(uuid.uuid4()),
        user_id=uid,
        name=preset.name,
        platform=preset.platform,
        quality=preset.quality,
        advanced=_json.dumps(preset.advanced or {}),
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(row)
    db.commit()
    rows = db.query(UserPresetRow).filter(UserPresetRow.user_id == uid).all()
    presets = [{"name": r.name, "platform": r.platform, "quality": r.quality, "advanced": _json.loads(r.advanced or "{}")} for r in rows]
    return {"ok": True, "presets": presets}


@app.get("/user-presets")
def get_user_presets(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user["id"]
    rows = db.query(UserPresetRow).filter(UserPresetRow.user_id == uid).all()
    presets = [{"name": r.name, "platform": r.platform, "quality": r.quality, "advanced": _json.loads(r.advanced or "{}")} for r in rows]
    return {"presets": presets}


@app.delete("/user-presets/{name}")
def delete_user_preset(name: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user["id"]
    db.query(UserPresetRow).filter(UserPresetRow.user_id == uid, UserPresetRow.name == name).delete()
    db.commit()
    return {"ok": True}

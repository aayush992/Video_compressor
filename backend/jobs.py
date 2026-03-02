"""
jobs.py - Job persistence using SQLAlchemy (Postgres or SQLite).
- create_job / get_job / list_jobs / get_jobs_by_user: take a db Session (from FastAPI dependency)
- update_job: opens its own session (called from background threads in encoding.py)
"""
import json
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session

from .models import Job


def _row_to_job(row) -> Job:
    """Convert a JobRow ORM object to a Job Pydantic model."""
    import os
    input_meta = None
    if row.input_metadata:
        from .models import MediaMetadata
        try:
            data = row.input_metadata if isinstance(row.input_metadata, dict) else json.loads(row.input_metadata)
            input_meta = MediaMetadata(**data)
        except Exception:
            pass

    # Derive output_filename from output_path (basename) so the frontend can build a download URL
    output_filename = os.path.basename(row.output_path) if row.output_path else None

    # Compute percent_saved from stored sizes
    orig = int(row.input_size) if row.input_size else None
    comp = int(row.output_size) if row.output_size else None
    pct  = round((1 - comp / orig) * 100, 1) if orig and comp and orig > 0 else None

    return Job(
        id=row.id,
        user_id=row.user_id or "",
        status=row.status,
        media_type=row.media_type,
        platform=row.platform,
        quality=getattr(row, 'quality', None) or "",
        inputPath=row.input_path or "",
        outputPath=row.output_path or "",
        inputUrl=row.input_url or "",
        outputUrl=row.output_url or "",
        output_filename=output_filename,
        progress=row.progress or 0.0,
        error=row.error or "",
        created_at=row.created_at,
        completed_at=row.completed_at or "",
        original_size=orig,
        compressed_size=comp,
        percent_saved=pct,
        input=input_meta,
    )


def _job_to_row_dict(job: Job) -> dict:
    """Convert Job Pydantic model to dict for JobRow columns."""
    input_meta_dict = None
    if job.input:
        try:
            input_meta_dict = job.input.model_dump()
        except Exception:
            input_meta_dict = None
    return dict(
        id=job.id,
        user_id=job.user_id or "",
        status=job.status,
        media_type=job.media_type or "",
        platform=job.platform or "",
        input_path=job.inputPath or "",
        output_path=job.outputPath or "",
        input_url=job.inputUrl or "",
        output_url=job.outputUrl or "",
        progress=job.progress or 0.0,
        error=job.error or "",
        created_at=job.created_at or datetime.now(timezone.utc).isoformat(),
        completed_at=job.completed_at or "",
        input_size=float(job.original_size) if job.original_size else 0.0,
        output_size=float(job.compressed_size) if job.compressed_size else 0.0,
        input_metadata=input_meta_dict,
    )


def create_job(job: Job, db: Session) -> None:
    from .database import JobRow
    row = JobRow(**_job_to_row_dict(job))
    db.add(row)
    db.commit()


def get_job(job_id: str, db: Optional[Session] = None) -> Optional[Job]:
    from .database import JobRow, SessionLocal
    close_after = False
    if db is None:
        db = SessionLocal()
        close_after = True
    try:
        row = db.query(JobRow).filter(JobRow.id == job_id).first()
        return _row_to_job(row) if row else None
    finally:
        if close_after:
            db.close()


def update_job(job: Job, db: Optional[Session] = None) -> None:
    """
    Update an existing job row. If db is None (e.g. called from a background
    encoding thread), opens a fresh session automatically.
    When status becomes 'done', attempts to upload the output file to Cloudinary
    (if CLOUDINARY_URL is configured) and persists the URL in output_url.
    """
    from .database import JobRow, SessionLocal
    from .storage import upload_processed

    # If job just finished successfully, try Cloudinary upload
    if job.status == "done" and job.output_filename and not job.outputUrl:
        try:
            from .storage import get_processed_path
            local_path = get_processed_path(job.output_filename)
            url = upload_processed(local_path, job.output_filename)
            if url:
                job = job.model_copy(update={"outputUrl": url})
        except Exception:
            pass  # Cloudinary failure is non-fatal

    close_after = False
    if db is None:
        db = SessionLocal()
        close_after = True
    try:
        row = db.query(JobRow).filter(JobRow.id == job.id).first()
        if not row:
            row = JobRow(**_job_to_row_dict(job))
            db.add(row)
        else:
            row.status = job.status
            row.progress = job.progress or 0.0
            row.output_path = job.outputPath or ""
            row.output_url = job.outputUrl or ""
            row.error = job.error or ""
            row.completed_at = job.completed_at or ""
            row.output_size = float(job.compressed_size) if job.compressed_size else 0.0
            if job.compressed_size and not row.output_path and job.output_filename:
                row.output_path = job.output_filename
        db.commit()
    finally:
        if close_after:
            db.close()


def list_jobs(db: Session) -> List[Job]:
    from .database import JobRow
    rows = db.query(JobRow).order_by(JobRow.created_at.desc()).all()
    return [_row_to_job(r) for r in rows]


def get_jobs_by_user(user_id: str, db: Session) -> List[Job]:
    """Return all jobs belonging to the given user, newest first."""
    from .database import JobRow
    rows = (
        db.query(JobRow)
        .filter(JobRow.user_id == user_id)
        .order_by(JobRow.created_at.desc())
        .all()
    )
    return [_row_to_job(r) for r in rows]

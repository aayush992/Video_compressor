"""
database.py – SQLAlchemy setup for PostgreSQL (production) or SQLite (local dev).

Set DATABASE_URL env var to a Postgres connection string for production.
Falls back to a local SQLite file for development.

Example Postgres URL (Render):
    postgresql://user:password@host:5432/dbname
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, String, Text, Float, DateTime, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from datetime import datetime, timezone

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{os.path.join(os.path.dirname(__file__), '..', 'dev.db')}"
)

# Render provides postgres:// but SQLAlchemy requires postgresql://
if _DATABASE_URL.startswith("postgres://"):
    _DATABASE_URL = _DATABASE_URL.replace("postgres://", "postgresql://", 1)

_connect_args = {"check_same_thread": False} if _DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(_DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ---------------------------------------------------------------------------
# ORM Models
# ---------------------------------------------------------------------------

class UserRow(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, default="")
    google_id = Column(String, default="")
    created_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())


class JobRow(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, default="")
    status = Column(String, default="queued")
    media_type = Column(String, default="")
    platform = Column(String, default="")
    input_path = Column(String, default="")
    output_path = Column(String, default="")
    input_url = Column(String, default="")   # Cloudinary URL for input
    output_url = Column(String, default="")  # Cloudinary URL for output
    progress = Column(Float, default=0.0)
    error = Column(Text, default="")
    created_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())
    completed_at = Column(String, default="")
    input_size = Column(Float, default=0.0)
    output_size = Column(Float, default=0.0)
    input_metadata = Column(JSON, nullable=True)


class UserPresetRow(Base):
    __tablename__ = "user_presets"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    platform = Column(String, default="")
    quality = Column(String, default="balanced")
    advanced = Column(JSON, nullable=True)
    created_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())


# ---------------------------------------------------------------------------
# Create all tables on startup
# ---------------------------------------------------------------------------

def init_db():
    Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

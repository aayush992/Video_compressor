"""
auth.py – User authentication helpers.

Supports:
  - Email / password (bcrypt hashed, persisted in PostgreSQL / SQLite)
  - Google OAuth2 (verifies tokenId via google-auth library)
  - JWT access tokens (python-jose, HS256)

Environment variables:
  JWT_SECRET       – secret key for signing tokens (default: "changeme-in-production")
  GOOGLE_CLIENT_ID – your Google OAuth2 client ID
  DATABASE_URL     – SQLAlchemy DB URL (default: local SQLite dev.db)
"""
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt as _bcrypt
from jose import JWTError, jwt
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Load .env from the project root (one level up from this file)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

_JWT_SECRET = os.getenv("JWT_SECRET", "changeme-in-production")
_JWT_ALGORITHM = "HS256"
_JWT_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
_GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# ---------------------------------------------------------------------------
# Password hashing  (using bcrypt directly)
# ---------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ---------------------------------------------------------------------------
# User row -> plain dict helper
# ---------------------------------------------------------------------------

def _row_to_dict(row) -> dict:
    return {
        "id": row.id,
        "email": row.email,
        "hashed_password": row.hashed_password,
        "google_id": row.google_id,
        "created_at": row.created_at,
    }


# ---------------------------------------------------------------------------
# DB-backed user operations
# ---------------------------------------------------------------------------

def register_user(email: str, password: str, db: Session) -> dict:
    """Create a new user. Raises ValueError if email already registered."""
    from .database import UserRow
    key = email.lower()
    existing = db.query(UserRow).filter(UserRow.email == key).first()
    if existing:
        raise ValueError("Email already registered.")
    row = UserRow(
        id=str(uuid.uuid4()),
        email=key,
        hashed_password=hash_password(password),
        google_id="",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _row_to_dict(row)


def authenticate_user(email: str, password: str, db: Session) -> dict:
    """Return user dict if credentials are valid, else raise ValueError."""
    from .database import UserRow
    row = db.query(UserRow).filter(UserRow.email == email.lower()).first()
    if not row or not verify_password(password, row.hashed_password):
        raise ValueError("Invalid email or password.")
    return _row_to_dict(row)


def get_or_create_google_user(email: str, google_id: str, db: Session) -> dict:
    """Find existing user by email or create one via Google Sign-In."""
    from .database import UserRow
    key = email.lower()
    row = db.query(UserRow).filter(UserRow.email == key).first()
    if row:
        return _row_to_dict(row)
    row = UserRow(
        id=str(uuid.uuid4()),
        email=key,
        hashed_password="",
        google_id=google_id,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _row_to_dict(row)


def get_user_by_id(user_id: str, db: Session) -> Optional[dict]:
    from .database import UserRow
    row = db.query(UserRow).filter(UserRow.id == user_id).first()
    return _row_to_dict(row) if row else None


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=_JWT_EXPIRE_MINUTES)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, _JWT_SECRET, algorithm=_JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify JWT. Returns payload dict. Raises JWTError on failure."""
    return jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])


# ---------------------------------------------------------------------------
# Google token verification
# ---------------------------------------------------------------------------

def verify_google_token(id_token: str) -> dict:
    """
    Verify a Google OAuth2 id_token from @react-oauth/google.
    Returns idinfo dict with 'sub', 'email', etc.
    Raises ValueError if verification fails.
    """
    if not _GOOGLE_CLIENT_ID:
        raise ValueError("GOOGLE_CLIENT_ID env var not set.")
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        idinfo = google_id_token.verify_oauth2_token(
            id_token, google_requests.Request(), _GOOGLE_CLIENT_ID
        )
        return idinfo
    except Exception as exc:
        raise ValueError(f"Google token verification failed: {exc}")


# ---------------------------------------------------------------------------
# FastAPI dependency – extract current user from Bearer token (no DB needed)
# ---------------------------------------------------------------------------

from fastapi import Header, HTTPException, status


def get_current_user(authorization: str = Header(default="")) -> dict:
    """
    FastAPI dependency. Decodes JWT claims only (no DB lookup).
    Returns {"id": ..., "email": ...} from token payload.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid token."
        )
    token = authorization[len("Bearer "):]
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired or invalid."
        )
    return {"id": payload.get("sub", ""), "email": payload.get("email", "")}

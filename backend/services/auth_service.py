"""
services/auth_service.py
------------------------
Business logic for auth:
  - bcrypt password hashing (cost factor 12)
  - JWT access token creation (15 min expiry)
  - Refresh token rotation (7 day expiry, stored as hash in DB)
  - Guest user creation
"""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from config import get_settings
from models import User, RefreshToken

settings = get_settings()

# bcrypt with cost factor 12 — slow enough to defeat brute-force
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


# ── Password helpers ───────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT helpers ────────────────────────────────────────────────────────────────

def create_access_token(user_id: str, email: str | None, is_guest: bool) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": user_id,
        "email": email or "",
        "is_guest": is_guest,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """Raises JWTError if invalid or expired."""
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


# ── Refresh token helpers ──────────────────────────────────────────────────────

def _hash_token(raw_token: str) -> str:
    """SHA-256 hash of raw refresh token — stored in DB, never the raw value."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


async def create_refresh_token(db: AsyncSession, user_id: uuid.UUID) -> str:
    """Generate a secure random refresh token, store its hash, return raw token."""
    raw = secrets.token_urlsafe(64)
    expires = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    db.add(RefreshToken(
        user_id=user_id,
        token_hash=_hash_token(raw),
        expires_at=expires,
    ))
    await db.flush()
    return raw


async def rotate_refresh_token(db: AsyncSession, raw_token: str) -> tuple[str, uuid.UUID]:
    """
    Validate old refresh token, delete it, issue a new one.
    Returns (new_raw_token, user_id).
    Raises ValueError if token not found or expired.
    """
    token_hash = _hash_token(raw_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    stored = result.scalar_one_or_none()

    if not stored:
        raise ValueError("Refresh token not found or already used")
    if stored.expires_at < datetime.now(timezone.utc):
        await db.delete(stored)
        raise ValueError("Refresh token expired")

    user_id = stored.user_id
    await db.delete(stored)
    new_raw = await create_refresh_token(db, user_id)
    return new_raw, user_id


async def revoke_refresh_token(db: AsyncSession, raw_token: str) -> None:
    """Delete refresh token on logout."""
    token_hash = _hash_token(raw_token)
    await db.execute(delete(RefreshToken).where(RefreshToken.token_hash == token_hash))


# ── User operations ────────────────────────────────────────────────────────────

async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def register_user(db: AsyncSession, email: str, password: str) -> User:
    existing = await get_user_by_email(db, email)
    if existing:
        raise ValueError("Email already registered")
    user = User(email=email.lower(), password_hash=hash_password(password))
    db.add(user)
    await db.flush()   # get the UUID before commit
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    user = await get_user_by_email(db, email.lower())
    if not user or not user.password_hash:
        raise ValueError("Invalid email or password")
    if not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password")
    if not user.is_active:
        raise ValueError("Account is deactivated")
    return user


async def create_guest_user(db: AsyncSession) -> User:
    user = User(is_guest=True, email=None, password_hash=None)
    db.add(user)
    await db.flush()
    return user

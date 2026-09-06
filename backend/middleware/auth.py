"""
middleware/auth.py
------------------
JWT validation using our own JWT_SECRET (no Supabase).
Rate-limit key function keyed on user_id (not IP).
"""

from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from slowapi.util import get_remote_address
from config import get_settings
from services.auth_service import decode_access_token

settings = get_settings()
_bearer = HTTPBearer(auto_error=False)


async def get_current_user(request: Request) -> dict:
    """
    FastAPI dependency — validates our own JWT (not Supabase).
    Returns dict with user_id, email, is_guest.
    Raises 401 if token missing or invalid/expired.
    """
    credentials: HTTPAuthorizationCredentials | None = await _bearer(request)

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing user id",
        )

    # Store on request.state so logging middleware can read it
    request.state.user_id = user_id
    return {
        "user_id": user_id,
        "email": payload.get("email", ""),
        "is_guest": payload.get("is_guest", False),
    }


def get_user_id_for_rate_limit(request: Request) -> str:
    """
    Rate-limit key function for slowapi.
    Uses user_id from JWT — a VPN change cannot bypass limits.
    Falls back to IP for unauthenticated requests.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            payload = decode_access_token(token)
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except Exception:
            pass
    return get_remote_address(request)

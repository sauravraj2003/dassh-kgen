"""
routers/auth.py — Auth endpoints (no Supabase dependency).

POST /auth/register   — create account
POST /auth/login      — email + password login
POST /auth/guest      — anonymous guest session
POST /auth/refresh    — rotate access token using refresh token
POST /auth/logout     — revoke refresh token
GET  /auth/me         — get current user profile
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Cookie
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth import get_current_user
from services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE = "dassh_refresh"
COOKIE_SECURE = False   # set True in production (HTTPS only)
COOKIE_SAMESITE = "lax"


# ── Schemas ────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    is_guest: bool


class UserProfile(BaseModel):
    user_id: str
    email: str
    is_guest: bool


# ── Helpers ────────────────────────────────────────────────────────────────────

def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=raw_token,
        httponly=True,          # JS cannot read it
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=7 * 24 * 3600,  # 7 days
        path="/auth/refresh",   # only sent on refresh endpoint
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE, path="/auth/refresh")


async def _build_token_response(
    response: Response, db: AsyncSession, user, email: str | None
) -> TokenResponse:
    access = auth_service.create_access_token(
        str(user.id), email, user.is_guest
    )
    refresh_raw = await auth_service.create_refresh_token(db, user.id)
    _set_refresh_cookie(response, refresh_raw)
    return TokenResponse(
        access_token=access,
        user_id=str(user.id),
        email=email or "guest",
        is_guest=user.is_guest,
    )


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """Register a new user and return tokens."""
    try:
        user = await auth_service.register_user(db, body.email, body.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return await _build_token_response(response, db, user, body.email)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """Login with email + password."""
    try:
        user = await auth_service.authenticate_user(db, body.email, body.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    return await _build_token_response(response, db, user, user.email)


@router.post("/guest", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def guest_login(response: Response, db: AsyncSession = Depends(get_db)):
    """Create an anonymous guest session."""
    user = await auth_service.create_guest_user(db)
    return await _build_token_response(response, db, user, None)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    response: Response,
    db: AsyncSession = Depends(get_db),
    dassh_refresh: str | None = Cookie(default=None, alias=REFRESH_COOKIE),
):
    """Rotate refresh token and issue new access token."""
    if not dassh_refresh:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")
    try:
        new_raw, user_id = await auth_service.rotate_refresh_token(db, dassh_refresh)
    except ValueError as e:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    user = await auth_service.get_user_by_id(db, user_id)
    if not user:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    _set_refresh_cookie(response, new_raw)
    access = auth_service.create_access_token(str(user.id), user.email, user.is_guest)
    return TokenResponse(
        access_token=access,
        user_id=str(user.id),
        email=user.email or "guest",
        is_guest=user.is_guest,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    db: AsyncSession = Depends(get_db),
    dassh_refresh: str | None = Cookie(default=None, alias=REFRESH_COOKIE),
):
    """Revoke refresh token and clear cookie."""
    if dassh_refresh:
        await auth_service.revoke_refresh_token(db, dassh_refresh)
    _clear_refresh_cookie(response)


@router.get("/me", response_model=UserProfile)
async def me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user's profile."""
    return UserProfile(
        user_id=current_user["user_id"],
        email=current_user["email"],
        is_guest=current_user.get("is_guest", False),
    )

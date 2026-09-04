"""
main.py — DASSH FastAPI application (no Supabase).
Run: uvicorn main:app --reload --port 7700
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config import get_settings
from database import create_tables
from middleware.auth import get_user_id_for_rate_limit
from middleware.logging_middleware import RequestLoggingMiddleware
from routers import chat, game
from routers.auth import router as auth_router
from routers.conversations import router as conversations_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks."""
    await create_tables()   # create DB tables if they don't exist
    yield


app = FastAPI(
    title="DASSH API",
    description="Backend for DASSH — AI-Powered Game Platform",
    version="1.0.0",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)

# Rate limiter
limiter = Limiter(key_func=get_user_id_for_rate_limit)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middleware
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "x-groq-api-key", "x-gemini-api-key", "x-openai-api-key"],
)

# Routers
app.include_router(auth_router)              # /auth/*
app.include_router(conversations_router)     # /api/v1/conversations/*
app.include_router(chat.router)              # /api/v1/chat
app.include_router(game.router)              # /api/v1/game/generate


@app.get("/health", tags=["health"])
async def health_check():
    return {
        "status": "ok",
        "version": "v1",
        "env": settings.env,
        "llm_provider": settings.llm_provider,
        "groq_configured": bool(settings.groq_api_key),
        "gemini_configured": bool(settings.gemini_api_key),
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )

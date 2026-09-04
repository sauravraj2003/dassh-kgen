"""
config.py — Centralised settings from environment variables.
All secrets live here. Never in frontend code.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://dassh:dassh_secret@localhost:5432/dassh_db"

    # ── JWT Auth (our own — no Supabase) ─────────────────────────────────────
    jwt_secret: str = "change-this-to-a-random-64-char-string-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # ── LLM Providers ────────────────────────────────────────────────────────
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    gemini_api_key: str = ""
    openai_api_key: str = ""
    llm_provider: str = "auto"

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    chat_rate_limit: int = 20
    game_rate_limit: int = 10

    # ── App ───────────────────────────────────────────────────────────────────
    cors_origin: str = "http://localhost:5174,http://localhost:8080"
    env: str = "development"

    @property
    def cors_origins(self) -> list[str]:
        """Parse comma-separated CORS_ORIGIN into a list."""
        return [o.strip() for o in self.cors_origin.split(",") if o.strip()]

    @property
    def is_development(self) -> bool:
        return self.env.lower() == "development"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

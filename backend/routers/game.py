"""
routers/game.py — POST /api/v1/game/generate
Rate limited per user_id. Returns full HTML5 game code.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter

from config import get_settings
from middleware.auth import get_current_user, get_user_id_for_rate_limit
from services.llm import generate_game_code

settings = get_settings()
limiter = Limiter(key_func=get_user_id_for_rate_limit)
router = APIRouter(prefix="/api/v1/game", tags=["game"])

VALID_CATEGORIES = {"rpg", "strategy", "puzzle", "open-world", "action", "arcade", ""}


class GameGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=1000)
    category: str = Field(default="", max_length=50)
    previous_html: str = Field(default="", max_length=100000)

    @field_validator("prompt")
    @classmethod
    def strip_prompt(cls, v: str) -> str:
        return v.strip()

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        v = v.strip().lower()
        if v and v not in VALID_CATEGORIES:
            raise ValueError(f"Invalid category. Choose from: {', '.join(VALID_CATEGORIES - {''})} ")
        return v


class GameGenerateResponse(BaseModel):
    html: str
    title: str
    prompt: str


@router.post("/generate", response_model=GameGenerateResponse)
@limiter.limit(f"{settings.game_rate_limit}/minute")
async def generate_game(
    request: Request,
    body: GameGenerateRequest,
    user: dict = Depends(get_current_user),
) -> GameGenerateResponse:
    """Generate a complete playable HTML5 canvas game. Rate limited per user."""
    try:
        user_keys = {
            "groq": request.headers.get("x-groq-api-key", ""),
            "gemini": request.headers.get("x-gemini-api-key", ""),
            "openai": request.headers.get("x-openai-api-key", ""),
        }
        html, title = await generate_game_code(body.prompt, body.category, body.previous_html, user_keys)
        html_lower = html.strip().lower()
        # Accept any response that looks like HTML (doctype, html tag, or has canvas/script)
        is_valid_html = (
            html_lower.startswith('<!doctype') or
            html_lower.startswith('<html') or
            '<canvas' in html_lower or
            ('<script' in html_lower and '<body' in html_lower)
        )
        if not is_valid_html:
            raise ValueError("AI did not return valid HTML game code")
        return GameGenerateResponse(html=html, title=title, prompt=body.prompt)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Game generation failed: {exc}")

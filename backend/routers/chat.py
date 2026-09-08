"""
routers/chat.py — POST /api/v1/chat
Rate limited per user_id (not IP). Requires Supabase JWT.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter

from config import get_settings
from middleware.auth import get_current_user, get_user_id_for_rate_limit
from services.llm import generate_chat_response

settings = get_settings()
limiter = Limiter(key_func=get_user_id_for_rate_limit)
router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class HistoryMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., max_length=100000)


class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    history: list[HistoryMessage] = Field(default_factory=list, max_length=20)

    @field_validator("prompt")
    @classmethod
    def strip_prompt(cls, v: str) -> str:
        return v.strip()


class ChatResponse(BaseModel):
    response: str


@router.post("", response_model=ChatResponse)
@limiter.limit(f"{settings.chat_rate_limit}/minute")
async def chat(
    request: Request,
    body: ChatRequest,
    user: dict = Depends(get_current_user),
) -> ChatResponse:
    """Send a message to the AI. Rate limited per user. Requires Supabase JWT."""
    try:
        user_keys = {
            "groq": request.headers.get("x-groq-api-key", ""),
            "gemini": request.headers.get("x-gemini-api-key", ""),
            "openai": request.headers.get("x-openai-api-key", ""),
        }
        history_dicts = [{"role": m.role, "content": m.content} for m in body.history]
        ai_response = await generate_chat_response(body.prompt, history_dicts, user_keys)
        return ChatResponse(response=ai_response)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Unexpected error: {exc}")

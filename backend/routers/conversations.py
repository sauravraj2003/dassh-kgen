"""
routers/conversations.py — Conversation + Message CRUD endpoints.

All routes require JWT auth. Users can only access their own data.

GET    /api/v1/conversations              — list all conversations (batched query)
POST   /api/v1/conversations              — create conversation
DELETE /api/v1/conversations/{id}         — delete conversation (cascades messages)
PUT    /api/v1/conversations/{id}         — update title
POST   /api/v1/conversations/{id}/messages — append a message
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from database import get_db
from middleware.auth import get_current_user
from models import Conversation, Message

router = APIRouter(prefix="/api/v1/conversations", tags=["conversations"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: str

    @classmethod
    def from_orm(cls, m: Message):
        return cls(id=str(m.id), role=m.role, content=m.content, created_at=m.created_at.isoformat())


class ConversationOut(BaseModel):
    id: str
    title: str
    messages: list[MessageOut]
    created_at: str
    updated_at: str

    @classmethod
    def from_orm(cls, c: Conversation):
        return cls(
            id=str(c.id),
            title=c.title,
            messages=[MessageOut.from_orm(m) for m in c.messages],
            created_at=c.created_at.isoformat(),
            updated_at=c.updated_at.isoformat(),
        )


class CreateConversationRequest(BaseModel):
    title: str = Field(default="New Chat", max_length=200)


class UpdateTitleRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)


class AddMessageRequest(BaseModel):
    id: str = Field(..., description="Client-generated UUID for optimistic UI")
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=32000)


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ConversationOut])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Two-query approach (fixes N+1):
      1. Fetch all conversations for user
      2. Eager-load all messages in the same query via selectinload
    """
    user_id = uuid.UUID(user["user_id"])
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .options(selectinload(Conversation.messages))
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()
    return [ConversationOut.from_orm(c) for c in conversations]


@router.post("", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: CreateConversationRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(user["user_id"])
    conv = Conversation(user_id=user_id, title=body.title)
    db.add(conv)
    await db.flush()
    await db.refresh(conv) # Get created_at
    return ConversationOut(
        id=str(conv.id),
        title=conv.title,
        messages=[],
        created_at=conv.created_at.isoformat(),
        updated_at=conv.updated_at.isoformat(),
    )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(user["user_id"])
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == uuid.UUID(conversation_id),
            Conversation.user_id == user_id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    await db.delete(conv)


@router.put("/{conversation_id}", response_model=ConversationOut)
async def update_title(
    conversation_id: str,
    body: UpdateTitleRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(user["user_id"])
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == uuid.UUID(conversation_id), Conversation.user_id == user_id)
        .options(selectinload(Conversation.messages))
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    conv.title = body.title
    await db.flush()
    return ConversationOut.from_orm(conv)


@router.post("/{conversation_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def add_message(
    conversation_id: str,
    body: AddMessageRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(user["user_id"])
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == uuid.UUID(conversation_id),
            Conversation.user_id == user_id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    # Use client-provided UUID for optimistic UI consistency
    try:
        msg_id = uuid.UUID(body.id)
    except ValueError:
        msg_id = uuid.uuid4()

    msg = Message(id=msg_id, conversation_id=conv.id, role=body.role, content=body.content)
    db.add(msg)
    await db.flush()
    return MessageOut.from_orm(msg)

"""
database.py — Async SQLAlchemy engine + session factory.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.is_development,   # SQL logging in dev only
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,             # reconnect on stale connections
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields a DB session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    """Create all tables on startup (dev only). Use Alembic in production."""
    async with engine.begin() as conn:
        from models import Base as ModelBase  # avoid circular import
        await conn.run_sync(ModelBase.metadata.create_all)

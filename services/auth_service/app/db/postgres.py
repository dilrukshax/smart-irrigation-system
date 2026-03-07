"""
PostgreSQL database connection and session management (Neon / asyncpg).
"""

import logging
import re
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


def _build_async_url(url: str) -> tuple[str, dict]:
    """
    Convert a standard postgresql:// URL to postgresql+asyncpg://.
    Strips libpq-only params (sslmode, channel_binding) and returns
    the cleaned URL plus connect_args with ssl="require" if needed.
    """
    needs_ssl = "sslmode=require" in url or "sslmode=verify" in url

    # Switch scheme
    async_url = re.sub(r"^postgresql://", "postgresql+asyncpg://", url)
    async_url = re.sub(r"^postgres://", "postgresql+asyncpg://", async_url)

    # Strip libpq-specific query params asyncpg doesn't understand
    parsed = urlparse(async_url)
    params = parse_qs(parsed.query)
    for key in ("sslmode", "channel_binding"):
        params.pop(key, None)
    new_query = urlencode({k: v[0] for k, v in params.items()})
    clean_url = urlunparse(parsed._replace(query=new_query))

    connect_args = {"ssl": "require"} if needs_ssl else {}
    return clean_url, connect_args


_async_url, _connect_args = _build_async_url(settings.DATABASE_URL)

engine = create_async_engine(
    _async_url,
    connect_args=_connect_args,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Connection state flag
is_connected: bool = False


async def connect_to_db():
    """Create all tables and verify connection on startup."""
    global is_connected
    logger.info("Connecting to PostgreSQL (Neon)...")
    try:
        # Import models so metadata is populated
        from app.models import user as _  # noqa: F401

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Quick ping
        async with AsyncSessionLocal() as session:
            await session.execute(__import__("sqlalchemy").text("SELECT 1"))

        is_connected = True
        logger.info("Connected to PostgreSQL successfully")
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL: {e}")
        is_connected = False
        if settings.DEBUG:
            logger.warning("DEBUG mode: Application will continue without database")
        else:
            raise


async def close_db():
    """Dispose the async engine on shutdown."""
    logger.info("Closing PostgreSQL connection pool...")
    await engine.dispose()
    logger.info("PostgreSQL connection pool closed")


async def get_db_session() -> AsyncSession:
    """
    FastAPI dependency — yields an AsyncSession per request.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

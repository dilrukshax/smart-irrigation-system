"""
Async database engine/session management for forecasting service.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
import logging
import socket
import re
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.base import Base

logger = logging.getLogger(__name__)

_LOCAL_DOCKER_DB_HOSTS = {"postgres", "postgresql", "db"}


def _normalize_local_db_host(url: str) -> str:
    """
    Rewrite Docker-only DB hosts to localhost when running outside containers.
    """
    parsed = make_url(url)
    host = parsed.host
    if not host:
        return url

    if host not in _LOCAL_DOCKER_DB_HOSTS:
        return url

    try:
        socket.getaddrinfo(host, None)
        return url
    except OSError:
        normalized = str(parsed.set(host="localhost"))
        logger.warning("Database host '%s' is unreachable locally. Falling back to localhost.", host)
        return normalized


def _build_async_url(url: str) -> tuple[str, dict]:
    needs_ssl = "sslmode=require" in url or "sslmode=verify" in url

    async_url = re.sub(r"^postgresql://", "postgresql+asyncpg://", url)
    async_url = re.sub(r"^postgres://", "postgresql+asyncpg://", async_url)

    parsed = urlparse(async_url)
    params = parse_qs(parsed.query)
    for key in ("sslmode", "channel_binding"):
        params.pop(key, None)
    new_query = urlencode({k: v[0] for k, v in params.items()})
    clean_url = urlunparse(parsed._replace(query=new_query))

    connect_args = {"ssl": "require"} if needs_ssl else {}
    return clean_url, connect_args


_database_url = _normalize_local_db_host(settings.database_url)
_async_url, _connect_args = _build_async_url(_database_url)

engine = create_async_engine(
    _async_url,
    connect_args=_connect_args,
    pool_pre_ping=True,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    await engine.dispose()


@asynccontextmanager
async def session_scope():
    session: AsyncSession = AsyncSessionLocal()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()

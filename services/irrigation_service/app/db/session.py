"""
Async database engine/session management for irrigation service.
"""

from contextlib import asynccontextmanager
import logging
import socket
import re
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.base import Base

logger = logging.getLogger(__name__)

_LOCAL_DOCKER_DB_HOSTS = {"postgres", "postgresql", "db"}

_LEGACY_COLUMN_PATCHES: dict[str, dict[str, str]] = {
    "irrigation_crop_fields": {
        "soil_type": "VARCHAR(64)",
        "owner_id": "VARCHAR(128)",
        "scheme_id": "VARCHAR(128)",
        "latitude": "DOUBLE PRECISION",
        "longitude": "DOUBLE PRECISION",
        "location_name": "VARCHAR(255)",
        "lifecycle_state": "VARCHAR(32) DEFAULT 'CONFIGURED'",
        "pairing_status": "VARCHAR(32) DEFAULT 'UNPAIRED'",
        "last_handshake_at": "TIMESTAMPTZ",
        "live_since": "TIMESTAMPTZ",
        "suspended_reason": "TEXT",
    },
    "irrigation_manual_requests": {
        "closed_by": "VARCHAR(128)",
        "executed_at": "TIMESTAMPTZ",
        "closed_at": "TIMESTAMPTZ",
        "execution_note": "TEXT",
    },
    "irrigation_hydraulic_schedules": {
        "policy_id": "VARCHAR(36)",
        "policy_version": "INTEGER",
    },
}


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
    """
    Convert postgres URL to asyncpg URL and remove libpq-only args.
    """
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
    """
    Initialize DB connectivity.

    Schema migrations should be applied via Alembic. Table creation is only
    allowed when `auto_create_schema=true` for local bootstrap convenience.
    """
    should_auto_create = settings.auto_create_schema or settings.environment.lower() in {
        "development",
        "dev",
        "local",
        "test",
    }

    async with engine.begin() as conn:
        if should_auto_create:
            await conn.run_sync(Base.metadata.create_all)

        for table_name, columns in _LEGACY_COLUMN_PATCHES.items():
            table_exists_result = await conn.execute(
                text(
                    """
                    SELECT EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                          AND table_name = :table_name
                    )
                    """
                ),
                {"table_name": table_name},
            )
            table_exists = bool(table_exists_result.scalar())
            if not table_exists:
                continue

            existing_columns_result = await conn.execute(
                text(
                    """
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = :table_name
                    """
                ),
                {"table_name": table_name},
            )
            existing_columns = {row[0] for row in existing_columns_result}

            for column_name, column_type in columns.items():
                if column_name in existing_columns:
                    continue
                logger.warning(
                    "Applying legacy schema patch: %s.%s (%s)",
                    table_name,
                    column_name,
                    column_type,
                )
                await conn.execute(
                    text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
                )


async def close_db() -> None:
    """
    Close connection pool.
    """
    await engine.dispose()


@asynccontextmanager
async def session_scope():
    """
    Transactional scope for DB operations.
    """
    session: AsyncSession = AsyncSessionLocal()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()

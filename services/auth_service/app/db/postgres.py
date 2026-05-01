"""
PostgreSQL database connection and session management (Neon / asyncpg).
"""

import logging
import re
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse

from sqlalchemy import delete, inspect, select, text
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


ROLE_NORMALIZATION_SQL = """
UPDATE users
SET roles = COALESCE(
    (
        SELECT ARRAY(
            SELECT DISTINCT normalized_role
            FROM (
                SELECT CASE
                    WHEN role = 'admin' THEN 'authority'
                    WHEN role = 'user' THEN NULL
                    ELSE role
                END AS normalized_role
                FROM unnest(roles) AS role
            ) t
            WHERE normalized_role IS NOT NULL
            AND normalized_role = ANY(ARRAY['farmer','officer','authority'])
        )
    ),
    ARRAY['farmer']::varchar[]
)
"""


DEFAULT_DEV_USERS = (
    {
        "username": "farmer",
        "password": "farmer123",
        "email": "farmer@smartirrigation.com",
        "roles": ["farmer"],
        "schemes": [],
    },
    {
        "username": "officer",
        "password": "officer123",
        "email": "officer@smartirrigation.com",
        "roles": ["officer"],
        "schemes": [],
    },
    {
        "username": "authority",
        "password": "authority123",
        "email": "authority@smartirrigation.com",
        "roles": ["authority"],
        "schemes": [],
    },
)


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


def _ensure_core_auth_tables(sync_conn) -> list[str]:
    """
    Ensure core auth tables are present.

    This guards local/dev setups where migrations were not applied yet.
    """
    # Import models so metadata is populated when called from run_sync.
    from app.models import SchemeAssignment, User  # noqa: F401

    existing_tables = set(inspect(sync_conn).get_table_names(schema="public"))
    created: list[str] = []
    for table_name in ("users", "scheme_assignments"):
        if table_name in existing_tables:
            continue
        table = Base.metadata.tables.get(table_name)
        if table is None:
            continue
        table.create(bind=sync_conn, checkfirst=True)
        created.append(table_name)

    if "users" in existing_tables:
        user_columns = {column["name"] for column in inspect(sync_conn).get_columns("users", schema="public")}
        if "full_name" not in user_columns:
            sync_conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(120)"))
            created.append("users.full_name")
        if "national_id" not in user_columns:
            sync_conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS national_id VARCHAR(32)"))
            created.append("users.national_id")
        if "phone_number" not in user_columns:
            sync_conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(32)"))
            created.append("users.phone_number")
        sync_conn.execute(
            text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_national_id ON users (national_id) WHERE national_id IS NOT NULL")
        )
    return created


async def _normalize_roles() -> None:
    """Normalize legacy roles to farmer/officer/authority."""
    async with AsyncSessionLocal() as session:
        await session.execute(text(ROLE_NORMALIZATION_SQL))
        await session.commit()


async def _seed_default_users() -> None:
    """
    Ensure baseline farmer/officer/authority users exist in debug mode.

    Existing baseline users are also re-enabled and reset to known credentials.
    """
    from app.core.roles import normalize_roles
    from app.core.security import hash_password
    from app.models.scheme_assignment import SchemeAssignment
    from app.models.user import User

    default_scheme = settings.DEFAULT_SCHEME_ID.strip() or "scheme-default"
    entries = []
    for entry in DEFAULT_DEV_USERS:
        schemes = entry["schemes"] or (
            [default_scheme] if "farmer" not in entry["roles"] else []
        )
        entries.append({**entry, "schemes": schemes})

    async with AsyncSessionLocal() as session:
        for entry in entries:
            username = entry["username"].lower().strip()
            result = await session.execute(select(User).where(User.username == username))
            user = result.scalar_one_or_none()
            if user is None:
                user = User(
                    username=username,
                    email=entry["email"],
                    hashed_password=hash_password(entry["password"]),
                    roles=normalize_roles(entry["roles"]),
                    is_active=True,
                )
                session.add(user)
                await session.flush()
                logger.info("Seeded default %s user", username)
            else:
                user.email = entry["email"]
                user.roles = normalize_roles(entry["roles"])
                user.is_active = True
                # Keep baseline credentials stable for local testing.
                user.hashed_password = hash_password(entry["password"])

            await session.execute(delete(SchemeAssignment).where(SchemeAssignment.user_id == user.id))
            for scheme_id in entry["schemes"]:
                session.add(SchemeAssignment(user_id=user.id, scheme_id=scheme_id))

        await session.commit()


async def _ensure_bootstrap_authority() -> None:
    """Ensure the configured authority login exists outside debug-only seeds."""
    from app.core.bootstrap_authority import (
        ensure_bootstrap_authority,
        get_bootstrap_authority_config,
    )

    config = get_bootstrap_authority_config(settings)
    async with AsyncSessionLocal() as session:
        await ensure_bootstrap_authority(session, config)
        await session.commit()
        logger.info("Ensured bootstrap authority user '%s'", config.username)


async def connect_to_db():
    """Create all tables and verify connection on startup."""
    global is_connected
    logger.info("Connecting to PostgreSQL (Neon)...")
    try:
        # Import models so metadata is populated
        from app.models import User, SchemeAssignment  # noqa: F401

        if settings.AUTO_CREATE_SCHEMA:
            logger.warning("AUTO_CREATE_SCHEMA enabled; creating tables directly. Prefer Alembic migrations.")
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        elif settings.ENSURE_CORE_AUTH_SCHEMA:
            async with engine.begin() as conn:
                created_tables = await conn.run_sync(_ensure_core_auth_tables)
            if created_tables:
                logger.warning(
                    "Created missing auth tables without migration: %s",
                    ", ".join(created_tables),
                )

        # Quick ping
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))

        if settings.ENSURE_CORE_AUTH_SCHEMA:
            await _normalize_roles()

        if settings.ENSURE_BOOTSTRAP_AUTHORITY:
            await _ensure_bootstrap_authority()

        if settings.DEBUG and settings.SEED_DEFAULT_USERS_ON_STARTUP:
            await _seed_default_users()

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

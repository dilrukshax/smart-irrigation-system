"""
Stress summary repository.

Provides persistence for crop stress artifacts across service restarts.

Storage strategy:
- If `DATABASE_URL` is configured, artifacts are persisted to PostgreSQL
  in the `crop_stress_summaries` table (field_id PK, payload JSONB).
- Otherwise, artifacts are persisted to a JSON file at `ANALYSIS_ARTIFACTS_PATH`
  using an atomic write (write-temp-then-rename) to avoid corruption on crash.

Reads always return the latest summary per field_id.
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
from datetime import datetime
from typing import Dict, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    import psycopg2
    import psycopg2.extras
    PSYCOPG2_AVAILABLE = True
except ImportError:  # pragma: no cover
    PSYCOPG2_AVAILABLE = False


_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS crop_stress_summaries (
    field_id       VARCHAR(128) PRIMARY KEY,
    payload        JSONB        NOT NULL,
    generated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crop_stress_history (
    id             BIGSERIAL    PRIMARY KEY,
    field_id       VARCHAR(128) NOT NULL,
    payload        JSONB        NOT NULL,
    generated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crop_stress_history_field_time
    ON crop_stress_history (field_id, generated_at DESC);
"""


def _db_enabled() -> bool:
    return bool(settings.DATABASE_URL) and PSYCOPG2_AVAILABLE


def _get_conn():
    """Get a new psycopg2 connection. Callers must close it."""
    return psycopg2.connect(settings.DATABASE_URL)


def init_schema() -> None:
    """Create tables if they don't exist. Safe to call repeatedly."""
    if not _db_enabled():
        logger.info("Stress repo using file-based persistence (no DATABASE_URL)")
        return
    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(_SCHEMA_SQL)
            conn.commit()
        logger.info("crop_stress_summaries schema ready")
    except Exception as exc:
        logger.warning("Failed to init stress schema, falling back to file: %s", exc)


# -------- File-based persistence (fallback / default) --------

def _file_path() -> str:
    return settings.ANALYSIS_ARTIFACTS_PATH


def _atomic_write_json(path: str, data: dict) -> None:
    """Write JSON atomically via temp file + rename."""
    parent = os.path.dirname(path) or "."
    os.makedirs(parent, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".stress_", suffix=".json", dir=parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(data, fh)
        os.replace(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def _load_file() -> Dict[str, dict]:
    path = _file_path()
    if not path or not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Failed to read stress artifacts file; starting empty: %s", exc)
        return {}


def _save_file(cache: Dict[str, dict]) -> None:
    try:
        _atomic_write_json(_file_path(), cache)
    except Exception as exc:
        logger.warning("Failed to persist stress artifacts to file: %s", exc)


# -------- Unified read/write API --------

def load_all() -> Dict[str, dict]:
    """
    Load all stored artifacts keyed by field_id.

    When DB is enabled, pulls from crop_stress_summaries.
    Otherwise reads from the JSON artifact file.
    """
    if _db_enabled():
        try:
            with _get_conn() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                    cur.execute("SELECT field_id, payload FROM crop_stress_summaries")
                    return {row["field_id"]: dict(row["payload"]) for row in cur.fetchall()}
        except Exception as exc:
            logger.warning("DB load failed, falling back to file: %s", exc)
    return _load_file()


def get_summary(field_id: str) -> Optional[dict]:
    """Get the latest stress summary for a field, or None."""
    if _db_enabled():
        try:
            with _get_conn() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                    cur.execute(
                        "SELECT payload FROM crop_stress_summaries WHERE field_id = %s",
                        (field_id,),
                    )
                    row = cur.fetchone()
                    return dict(row["payload"]) if row else None
        except Exception as exc:
            logger.warning("DB get failed for %s, falling back to file: %s", field_id, exc)
    cache = _load_file()
    return cache.get(field_id)


def upsert_summary(field_id: str, payload: dict) -> None:
    """
    Upsert the latest stress summary for a field, and append to history.

    Persists to both DB (if enabled) and file (as cache/fallback).
    """
    # Always update in-memory cache file so readers without DB still work
    cache = _load_file()
    cache[field_id] = payload
    _save_file(cache)

    if not _db_enabled():
        return

    try:
        payload_json = psycopg2.extras.Json(payload)
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO crop_stress_summaries (field_id, payload, generated_at, updated_at)
                    VALUES (%s, %s, NOW(), NOW())
                    ON CONFLICT (field_id) DO UPDATE
                      SET payload = EXCLUDED.payload,
                          updated_at = NOW();
                    """,
                    (field_id, payload_json),
                )
                cur.execute(
                    "INSERT INTO crop_stress_history (field_id, payload) VALUES (%s, %s)",
                    (field_id, payload_json),
                )
            conn.commit()
    except Exception as exc:
        logger.warning("DB upsert failed for %s (file cache is still authoritative): %s", field_id, exc)


def get_history(field_id: str, limit: int = 50) -> list[dict]:
    """
    Get historical stress summaries for a field (newest first).
    Only works when DB is enabled; returns an empty list otherwise.
    """
    if not _db_enabled():
        return []
    try:
        with _get_conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                cur.execute(
                    """
                    SELECT payload, generated_at
                    FROM crop_stress_history
                    WHERE field_id = %s
                    ORDER BY generated_at DESC
                    LIMIT %s
                    """,
                    (field_id, limit),
                )
                return [
                    {**dict(row["payload"]), "generated_at": row["generated_at"].isoformat()}
                    for row in cur.fetchall()
                ]
    except Exception as exc:
        logger.warning("DB history query failed for %s: %s", field_id, exc)
        return []

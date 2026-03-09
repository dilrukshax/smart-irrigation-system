"""Tests for internal F4 field sync endpoints used by F1 service."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes_internal import router
from app.data.db import Base, get_db
from app.data.models_orm import Field


def _test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(router)
    return app


def test_internal_upsert_creates_and_updates_field():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)
    Base.metadata.create_all(bind=engine)

    app = _test_app()

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    create_resp = client.put(
        "/f4/internal/fields/field-new-01",
        json={
            "field_name": "Vegetable Plot A",
            "area_ha": 2.5,
            "scheme_id": "IRRIGATION",
        },
    )
    assert create_resp.status_code == 200
    assert create_resp.json()["created"] is True

    update_resp = client.put(
        "/f4/internal/fields/field-new-01",
        json={
            "field_name": "Vegetable Plot A - Updated",
            "area_ha": 3.0,
            "scheme_id": "IRRIGATION",
        },
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["created"] is False
    assert update_resp.json()["area_ha"] == 3.0

    db = TestingSessionLocal()
    try:
        row = db.query(Field).filter(Field.id == "field-new-01").first()
        assert row is not None
        assert row.name == "Vegetable Plot A - Updated"
        assert row.area_ha == 3.0
    finally:
        db.close()


def test_internal_delete_field():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)
    Base.metadata.create_all(bind=engine)

    app = _test_app()

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    client.put(
        "/f4/internal/fields/field-delete-01",
        json={
            "field_name": "Delete Plot",
            "area_ha": 1.0,
            "scheme_id": "IRRIGATION",
        },
    )

    delete_resp = client.delete("/f4/internal/fields/field-delete-01")
    assert delete_resp.status_code == 200
    assert delete_resp.json()["deleted"] is True

    delete_again_resp = client.delete("/f4/internal/fields/field-delete-01")
    assert delete_again_resp.status_code == 200
    assert delete_again_resp.json()["deleted"] is False

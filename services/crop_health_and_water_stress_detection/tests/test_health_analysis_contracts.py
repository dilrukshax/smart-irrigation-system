"""F2 health analysis contract/auth tests."""

from copy import deepcopy
from datetime import datetime
from typing import Any, Dict

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes import health_analysis
from app.dependencies.auth import get_current_user_context


def _test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(health_analysis.router)
    return app


def test_stress_summary_includes_message_when_artifact_exists(monkeypatch):
    app = _test_app()
    client = TestClient(app)

    artifacts = {
        "field-rice-01": {
            "field_id": "field-rice-01",
            "generated_at": datetime.utcnow().isoformat(),
            "stress_index": 0.42,
            "priority": "medium",
            "stress_penalty_factor": 0.2,
            "healthy_ratio": 0.35,
            "mild_stress_ratio": 0.45,
            "severe_stress_ratio": 0.2,
            "recommended_action": "Tune irrigation",
            "source": "analysis-artifact",
            "status": "ok",
            "is_live": True,
            "observed_at": datetime.utcnow().isoformat(),
            "staleness_sec": None,
            "quality": "good",
            "data_available": True,
            "message": None,
        }
    }
    monkeypatch.setattr(health_analysis, "_analysis_artifacts", artifacts)

    response = client.get("/api/v1/crop-health/fields/field-rice-01/stress-summary")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["data_available"] is True
    assert payload["message"] == "Stress summary available"


def test_stress_summary_analysis_pending_has_message(monkeypatch):
    app = _test_app()
    client = TestClient(app)

    monkeypatch.setattr(health_analysis, "_analysis_artifacts", {})
    monkeypatch.setattr(health_analysis.settings, "STRICT_LIVE_DATA", True)

    response = client.get("/api/v1/crop-health/fields/field-rice-99/stress-summary")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "analysis_pending"
    assert payload["data_available"] is False
    assert "not yet available" in (payload.get("message") or "")


def test_ingest_requires_auth_by_default():
    app = _test_app()
    client = TestClient(app)

    response = client.post(
        "/api/v1/crop-health/fields/field-rice-01/stress-summary/ingest",
        json={
            "field_id": "field-rice-01",
            "generated_at": datetime.utcnow().isoformat(),
            "stress_index": 0.1,
            "priority": "low",
            "stress_penalty_factor": 0.05,
            "healthy_ratio": 0.8,
            "mild_stress_ratio": 0.15,
            "severe_stress_ratio": 0.05,
            "recommended_action": "Maintain plan",
        },
    )
    assert response.status_code == 401


def test_ingest_returns_403_for_non_admin():
    app = _test_app()

    async def _non_admin() -> Dict[str, Any]:
        return {"id": "u1", "username": "farmer", "roles": ["farmer"]}

    app.dependency_overrides[get_current_user_context] = _non_admin
    client = TestClient(app)

    response = client.post(
        "/api/v1/crop-health/fields/field-rice-01/stress-summary/ingest",
        json={
            "field_id": "field-rice-01",
            "generated_at": datetime.utcnow().isoformat(),
            "stress_index": 0.1,
            "priority": "low",
            "stress_penalty_factor": 0.05,
            "healthy_ratio": 0.8,
            "mild_stress_ratio": 0.15,
            "severe_stress_ratio": 0.05,
            "recommended_action": "Maintain plan",
        },
    )
    assert response.status_code == 403


def test_ingest_returns_200_for_admin(monkeypatch):
    app = _test_app()

    async def _admin() -> Dict[str, Any]:
        return {"id": "a1", "username": "admin", "roles": ["admin"]}

    app.dependency_overrides[get_current_user_context] = _admin
    stored = {}

    def fake_persist():
        stored["persist_called"] = True

    monkeypatch.setattr(health_analysis, "_analysis_artifacts", {})
    monkeypatch.setattr(health_analysis, "_persist_artifacts", fake_persist)

    client = TestClient(app)
    response = client.post(
        "/api/v1/crop-health/fields/field-rice-01/stress-summary/ingest",
        json={
            "field_id": "field-rice-01",
            "generated_at": datetime.utcnow().isoformat(),
            "stress_index": 0.1,
            "priority": "low",
            "stress_penalty_factor": 0.05,
            "healthy_ratio": 0.8,
            "mild_stress_ratio": 0.15,
            "severe_stress_ratio": 0.05,
            "recommended_action": "Maintain plan",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["field_id"] == "field-rice-01"
    assert stored.get("persist_called") is True

    saved = deepcopy(health_analysis._analysis_artifacts["field-rice-01"])
    assert saved["status"] == "ok"
    assert saved["data_available"] is True
    assert saved["message"] == "Live stress summary ingested"

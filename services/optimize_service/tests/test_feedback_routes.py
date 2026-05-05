from __future__ import annotations

from datetime import date

from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.data.db import Base, get_db
from app.data.models_orm import Crop, Field, Recommendation
from app.dependencies.auth import get_current_user_context
from app.main import app


def test_feedback_outcome_round_trip_and_accuracy_report():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    def override_get_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user_context] = lambda: {
        "id": "farmer-1",
        "username": "farmer",
        "roles": ["farmer"],
    }

    db = Session()
    db.add_all(
        [
            Field(id="F1", name="Field 1", scheme_id="S1", area_ha=2.0),
            Crop(id="paddy", name="Paddy"),
            Recommendation(
                id=1,
                field_id="F1",
                season="Maha-2026",
                selected_crop_id="paddy",
                response_data={"recommendations": [{"crop_id": "paddy", "crop_name": "Paddy", "predicted_yield_t_ha": 4.0}]},
            ),
        ]
    )
    db.commit()
    db.close()

    client = TestClient(app)
    resp = client.post(
        "/f4/feedback/outcomes",
        json={
            "field_id": "F1",
            "crop_id": "paddy",
            "actual_crop_id": "paddy",
            "season": "Maha-2026",
            "year": 2026,
            "feedback_date": date(2026, 12, 1).isoformat(),
            "actual_yield_t_ha": 4.5,
            "recommendation_id": 1,
        },
    )
    assert resp.status_code == 200

    report = client.get("/f4/feedback/accuracy-report?season=Maha-2026")
    assert report.status_code == 200
    payload = report.json()["data"]
    assert payload["sample_count"] == 1
    assert payload["items"][0]["mae"] == 0.5

    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_current_user_context, None)

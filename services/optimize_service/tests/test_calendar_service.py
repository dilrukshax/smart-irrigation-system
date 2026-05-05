from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.data.db import Base
from app.data.models_orm import Crop, Field, Recommendation
from app.services.calendar_service import CropCalendarService


def test_generate_calendar_for_maha_field_persists_and_returns_sensible_dates():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    db.add(Field(id="F1", name="Field 1", scheme_id="S1", area_ha=2.0, soil_type="Clay"))
    db.add(Crop(id="paddy", name="Paddy", growth_duration_days=120, water_requirement_mm=900.0))
    db.add(Recommendation(id=1, field_id="F1", season="Maha-2026"))
    db.commit()

    payload = CropCalendarService.generate_calendar(
        crop={"crop_id": "paddy", "growth_duration_days": 120, "water_requirement_mm": 900.0},
        field={"id": "F1"},
        season="Maha-2026",
        planting_date=None,
        recommendation_id=1,
        db=db,
    )

    assert payload["field_id"] == "F1"
    assert payload["season"] == "Maha-2026"
    assert payload["planting_window_start"] == "2026-09-17"
    assert payload["planting_window_end"] == "2026-10-15"
    assert payload["harvest_window_start"].startswith("2027-01")
    assert len(payload["irrigation_windows"]) == 4
    assert payload["expected_market_week"].startswith("2027-W")

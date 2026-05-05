from __future__ import annotations

import asyncio
from types import SimpleNamespace

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.schemas import CropOption, PlanBResponse
from app.data.db import Base
from app.data.models_orm import Field, Recommendation
from app.services.planb_trigger_service import PlanBTriggerService


def test_planb_trigger_service_fires_drought_trigger(monkeypatch):
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    db.add(Field(id="F1", name="Field 1", scheme_id="S1", area_ha=2.0))
    db.add(
        Recommendation(
            id=1,
            field_id="F1",
            season="Maha-2026",
            selected_crop_id="paddy",
            response_data={"recommendations": [{"crop_id": "paddy", "predicted_price_per_kg": 100.0}]},
        )
    )
    db.commit()

    service = PlanBTriggerService()
    async def fake_drought(*args, **kwargs):
        return 0.85

    async def fake_reservoir(*args, **kwargs):
        return None

    monkeypatch.setattr("app.services.planb_trigger_service.fetch_f3_drought_risk", fake_drought)
    monkeypatch.setattr("app.services.planb_trigger_service.farmer_service.fetch_reservoir_snapshot", fake_reservoir)
    service._planb = SimpleNamespace(
        recompute_plan=lambda **kwargs: PlanBResponse(
            field_id="F1",
            season="Maha-2026",
            message="auto",
            adjusted_plan=[
                CropOption(
                    crop_id="maize",
                    crop_name="Maize",
                    suitability_score=0.8,
                    expected_yield_t_per_ha=3.0,
                    expected_profit_per_ha=100000.0,
                    risk_band="low",
                    rationale="better",
                )
            ],
            status="ok",
            source="optimization_service",
            is_live=True,
            data_available=True,
        )
    )

    events = asyncio.run(service.evaluate_triggers("F1", "Maha-2026", db))

    assert len(events) == 1
    assert events[0]["trigger_type"] == "drought_risk"
    assert events[0]["new_crop_id"] == "maize"

from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.data.db import Base
from app.data.models_orm import Field, Recommendation
from app.services.authority_service import AuthorityService


def test_scheme_dashboard_returns_fairness_and_compliance_metrics():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    db.add_all(
        [
            Field(id="F1", name="North", scheme_id="S1", area_ha=2.0, soil_type="Clay", water_availability_mm=900.0),
            Field(id="F2", name="South", scheme_id="S1", area_ha=3.0, soil_type="Loam", water_availability_mm=500.0),
            Recommendation(
                field_id="F1",
                season="Maha-2026",
                selected_crop_id="paddy",
                response_data={"recommendations": [{"crop_id": "paddy", "crop_name": "Paddy", "predicted_yield_t_ha": 5.0, "water_requirement_mm": 800}]},
            ),
            Recommendation(
                field_id="F2",
                season="Maha-2026",
                selected_crop_id="maize",
                response_data={"recommendations": [{"crop_id": "maize", "crop_name": "Maize", "predicted_yield_t_ha": 3.0, "water_requirement_mm": 450}]},
            ),
        ]
    )
    db.commit()

    dashboard = AuthorityService.get_scheme_dashboard("S1", "Maha-2026", db)

    assert dashboard["field_count"] == 2
    assert 0.0 <= dashboard["water_fairness_index"] <= 1.0
    assert dashboard["scheme_compliance_pct"] == 100.0
    assert len(dashboard["expected_supply_by_crop"]) == 2

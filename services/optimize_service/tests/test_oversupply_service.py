from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.data.db import Base
from app.data.models_orm import Field, PriceRecord, Recommendation
from app.services.oversupply_service import OversupplyService


def test_evaluate_scheme_creates_alert_when_crop_exceeds_warning_threshold():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    db.add_all(
        [
            Field(id="F1", name="A", scheme_id="S1", area_ha=4.0),
            Field(id="F2", name="B", scheme_id="S1", area_ha=3.0),
            Field(id="F3", name="C", scheme_id="S1", area_ha=3.0),
            Recommendation(field_id="F1", season="Maha-2026", selected_crop_id="paddy", response_data={"recommendations": [{"crop_id": "paddy", "crop_name": "Paddy"}]}),
            Recommendation(field_id="F2", season="Maha-2026", selected_crop_id="paddy", response_data={"recommendations": [{"crop_id": "paddy", "crop_name": "Paddy"}]}),
            Recommendation(field_id="F3", season="Maha-2026", selected_crop_id="maize", response_data={"recommendations": [{"crop_id": "maize", "crop_name": "Maize"}]}),
        ]
        + [
            PriceRecord(crop_id="paddy", date=date.today() - timedelta(weeks=8 - i), price_per_kg=100 - i * 5)
            for i in range(8)
        ]
    )
    db.commit()

    alerts = OversupplyService.evaluate_scheme("S1", "Maha-2026", db)

    assert len(alerts) == 1
    assert alerts[0]["crop_id"] == "paddy"
    assert alerts[0]["pct_of_scheme"] == 70.0

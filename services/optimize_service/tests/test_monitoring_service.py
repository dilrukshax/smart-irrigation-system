from __future__ import annotations

from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.data.db import Base
from app.data.models_orm import CropOutcome, Field, HistoricalYield, Recommendation
from app.services.monitoring_service import MonitoringService


def test_compute_psi_is_zero_for_identical_distributions_and_high_for_shifted():
    expected = [1, 2, 3, 4, 5] * 20
    identical = [1, 2, 3, 4, 5] * 20
    shifted = [10, 11, 12, 13, 14] * 20
    assert MonitoringService._compute_psi(expected, identical) == 0.0
    assert MonitoringService._compute_psi(expected, shifted) > 0.2


def test_run_backtest_persists_metrics():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    db.add(Field(id="F1", name="Field 1", scheme_id="S1", area_ha=2.0))
    db.add(HistoricalYield(field_id="F1", crop_id="paddy", season="Maha-2025", year=2025, yield_t_per_ha=4.0, is_synthetic=False))
    db.add(Recommendation(id=1, field_id="F1", season="Maha-2026", response_data={"recommendations": [{"predicted_yield_t_ha": 4.2}]}))
    db.add(CropOutcome(field_id="F1", crop_id="paddy", actual_crop_id="paddy", season="Maha-2026", year=2026, feedback_date=date.today(), actual_yield_t_ha=4.0, recommendation_id=1))
    db.commit()

    report = MonitoringService.run_backtest("yield_regressor", db)

    assert report["sample_count"] == 1
    assert report["mae"] == 0.2
    assert "id" in report

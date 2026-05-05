"""Phase 1 schema tests — ORM round-trips for all new models and repositories via SQLite."""

from __future__ import annotations

from datetime import date, datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.data.db import Base
from app.data.models_orm import (
    Crop,
    CropCalendar,
    CropOutcome,
    Field,
    ModelMonitoringRun,
    PlanBTriggerEvent,
    Recommendation,
    SchemeOversupplyAlert,
)
from app.data.repositories import (
    CropCalendarRepository,
    CropOutcomeRepository,
    ModelMonitoringRepository,
    PlanBTriggerRepository,
    SchemeOversupplyRepository,
)


@pytest.fixture(scope="module")
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed required FK targets
    session.add(Field(id="F001", name="Test Field", scheme_id="S001", area_ha=2.5))
    session.add(Crop(id="C001", name="Paddy", category="cereal"))
    session.add(Crop(id="C002", name="Maize", category="cereal"))
    session.add(Recommendation(field_id="F001", season="Maha-2025"))
    session.commit()

    yield session
    session.close()
    engine.dispose()


# ---------------------------------------------------------------------------
# CropOutcome
# ---------------------------------------------------------------------------

class TestCropOutcomeORM:
    def test_instantiate(self):
        obj = CropOutcome(
            field_id="F001",
            crop_id="C001",
            actual_crop_id="C001",
            season="Maha-2025",
            year=2026,
            feedback_date=date(2026, 3, 1),
        )
        assert obj.season == "Maha-2025"

    def test_save_and_retrieve(self, db_session):
        outcome_id = CropOutcomeRepository.save_outcome(
            db_session,
            field_id="F001",
            crop_id="C001",
            actual_crop_id="C001",
            season="Maha-2025",
            year=2026,
            feedback_date=date(2026, 3, 1),
            actual_yield_t_ha=4.2,
            actual_sale_price_kg=48.0,
            actual_water_used_mm=1100.0,
            notes="Good season",
            submitted_by="farmer_user_1",
        )
        assert outcome_id is not None

        results = CropOutcomeRepository.list_outcomes(db_session, field_id="F001", season="Maha-2025")
        assert len(results) >= 1
        assert results[0]["actual_yield_t_ha"] == pytest.approx(4.2)
        assert results[0]["submitted_by"] == "farmer_user_1"

    def test_prediction_vs_actual(self, db_session):
        rows = CropOutcomeRepository.get_prediction_vs_actual(db_session, season="Maha-2025")
        assert isinstance(rows, list)


# ---------------------------------------------------------------------------
# ModelMonitoringRun
# ---------------------------------------------------------------------------

class TestModelMonitoringORM:
    def test_instantiate(self):
        obj = ModelMonitoringRun(
            run_date=date(2026, 5, 1),
            model_name="yield_regressor",
            sample_count=50,
        )
        assert obj.model_name == "yield_regressor"

    def test_save_and_list(self, db_session):
        run_id = ModelMonitoringRepository.save_run(
            db_session,
            run_date=date(2026, 5, 1),
            model_name="yield_regressor",
            sample_count=50,
            mae=0.42,
            rmse=0.61,
            r2_score=0.78,
            drift_detected=False,
            drift_features={"soil_ph": 0.05},
        )
        assert run_id is not None

        runs = ModelMonitoringRepository.list_runs(db_session, model_name="yield_regressor")
        assert len(runs) >= 1
        assert runs[0]["mae"] == pytest.approx(0.42)
        assert runs[0]["drift_detected"] is False


# ---------------------------------------------------------------------------
# PlanBTriggerEvent
# ---------------------------------------------------------------------------

class TestPlanBTriggerORM:
    def test_instantiate(self):
        obj = PlanBTriggerEvent(
            field_id="F001",
            season="Maha-2025",
            trigger_type="drought_risk",
        )
        assert obj.trigger_type == "drought_risk"

    def test_save_and_list(self, db_session):
        trigger_id = PlanBTriggerRepository.save_trigger(
            db_session,
            field_id="F001",
            season="Maha-2025",
            trigger_type="drought_risk",
            trigger_value=0.82,
            threshold_value=0.70,
            previous_crop_id="C001",
            new_crop_id="C002",
        )
        assert trigger_id is not None

        events = PlanBTriggerRepository.list_triggers(db_session, field_id="F001", season="Maha-2025")
        assert len(events) >= 1
        assert events[0]["trigger_type"] == "drought_risk"
        assert events[0]["trigger_value"] == pytest.approx(0.82)


# ---------------------------------------------------------------------------
# CropCalendar
# ---------------------------------------------------------------------------

class TestCropCalendarORM:
    def test_instantiate(self):
        obj = CropCalendar(field_id="F001", crop_id="C001", season="Maha-2025")
        assert obj.season == "Maha-2025"

    def test_save_and_retrieve(self, db_session):
        cal_id = CropCalendarRepository.save_calendar(
            db_session,
            field_id="F001",
            crop_id="C001",
            season="Yala-2026",
            planting_window_start=date(2026, 4, 1),
            planting_window_end=date(2026, 4, 15),
            harvest_window_start=date(2026, 7, 30),
            harvest_window_end=date(2026, 8, 10),
            expected_market_week="2026-W32",
            irrigation_windows=[{"label": "initial", "start": "2026-04-01", "end": "2026-04-20", "mm_per_event": 30}],
            fertilizer_windows=[{"label": "basal", "start": "2026-04-01", "end": "2026-04-07", "product": "Urea"}],
        )
        assert cal_id is not None

        result = CropCalendarRepository.get_for_field_season(db_session, "F001", "Yala-2026")
        assert result is not None
        assert result["expected_market_week"] == "2026-W32"
        assert len(result["irrigation_windows"]) == 1


# ---------------------------------------------------------------------------
# SchemeOversupplyAlert
# ---------------------------------------------------------------------------

class TestSchemeOversupplyORM:
    def test_instantiate(self):
        obj = SchemeOversupplyAlert(scheme_id="S001", season="Maha-2025", crop_id="C001", severity="warning")
        assert obj.severity == "warning"

    def test_save_and_list_active(self, db_session):
        alert_id = SchemeOversupplyRepository.save_alert(
            db_session,
            scheme_id="S001",
            season="Maha-2025",
            crop_id="C001",
            crop_name="Paddy",
            area_allocated_ha=45.0,
            pct_of_scheme=52.5,
            alert_threshold_pct=40.0,
            price_trend_pct=-8.5,
            severity="critical",
        )
        assert alert_id is not None

        alerts = SchemeOversupplyRepository.list_active(db_session, scheme_id="S001", season="Maha-2025")
        assert len(alerts) >= 1
        assert alerts[0]["severity"] == "critical"
        assert alerts[0]["pct_of_scheme"] == pytest.approx(52.5)

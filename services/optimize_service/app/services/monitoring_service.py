"""Model monitoring and drift detection helpers."""

from __future__ import annotations

import math
from datetime import date
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.data.models_orm import CropOutcome, Field, HistoricalYield, Recommendation
from app.data.repositories import ModelMonitoringRepository


class MonitoringService:
    @classmethod
    def run_backtest(
        cls,
        model_name: str,
        db: Session,
        scheme_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        rows = (
            db.query(CropOutcome, Recommendation)
            .outerjoin(Recommendation, CropOutcome.recommendation_id == Recommendation.id)
            .all()
        )
        if scheme_id:
            allowed = {
                field_id
                for (field_id,) in db.query(Field.id).filter(Field.scheme_id == scheme_id).all()
            }
            rows = [row for row in rows if row[0].field_id in allowed]

        predictions: List[float] = []
        actuals: List[float] = []
        for outcome, rec in rows:
            if outcome.actual_yield_t_ha is None or not rec or not isinstance(rec.response_data, dict):
                continue
            recommendations = rec.response_data.get("recommendations") or []
            if not recommendations:
                continue
            predicted = recommendations[0].get("predicted_yield_t_ha")
            if predicted is None:
                continue
            predictions.append(float(predicted))
            actuals.append(float(outcome.actual_yield_t_ha))

        mae = cls._mae(actuals, predictions)
        rmse = cls._rmse(actuals, predictions)
        r2 = cls._r2(actuals, predictions)

        training_values = [
            float(value)
            for (value,) in db.query(HistoricalYield.yield_t_per_ha)
            .filter(HistoricalYield.is_synthetic == False)  # noqa: E712
            .all()
            if value is not None
        ]
        recent_values = actuals[-max(10, min(100, len(actuals))):]
        psi = cls._compute_psi(training_values, recent_values) if training_values and recent_values else 0.0
        drift_detected = cls.detect_drift("yield_t_per_ha", training_values, recent_values) if training_values and recent_values else False
        drift_features = {"yield_t_per_ha": round(psi, 4)} if training_values and recent_values else {}

        report = {
            "model_name": model_name,
            "scheme_id": scheme_id,
            "sample_count": len(actuals),
            "mae": mae,
            "rmse": rmse,
            "r2_score": r2,
            "drift_detected": drift_detected,
            "drift_features": drift_features,
        }

        run_id = ModelMonitoringRepository.save_run(
            db,
            run_date=date.today(),
            model_name=model_name,
            sample_count=len(actuals),
            scheme_id=scheme_id,
            mae=mae,
            rmse=rmse,
            r2_score=r2,
            drift_detected=drift_detected,
            drift_features=drift_features,
            report_payload=report,
        )
        report["id"] = run_id
        return report

    @staticmethod
    def _compute_psi(expected: List[float], actual: List[float], n_bins: int = 10) -> float:
        if not expected or not actual:
            return 0.0
        lo = min(min(expected), min(actual))
        hi = max(max(expected), max(actual))
        if math.isclose(lo, hi):
            return 0.0
        width = (hi - lo) / n_bins
        psi = 0.0
        for idx in range(n_bins):
            start = lo + idx * width
            end = hi if idx == n_bins - 1 else start + width
            expected_pct = MonitoringService._bin_pct(expected, start, end, idx == n_bins - 1)
            actual_pct = MonitoringService._bin_pct(actual, start, end, idx == n_bins - 1)
            expected_pct = max(expected_pct, 1e-6)
            actual_pct = max(actual_pct, 1e-6)
            psi += (actual_pct - expected_pct) * math.log(actual_pct / expected_pct)
        return round(psi, 4)

    @staticmethod
    def detect_drift(feature: str, training_values: List[float], recent_values: List[float]) -> bool:
        del feature
        return MonitoringService._compute_psi(training_values, recent_values) > 0.2

    @staticmethod
    def _bin_pct(values: List[float], start: float, end: float, inclusive_end: bool) -> float:
        if inclusive_end:
            count = sum(1 for value in values if start <= value <= end)
        else:
            count = sum(1 for value in values if start <= value < end)
        return count / len(values)

    @staticmethod
    def _mae(actuals: List[float], predictions: List[float]) -> Optional[float]:
        if not actuals or len(actuals) != len(predictions):
            return None
        return round(sum(abs(a - p) for a, p in zip(actuals, predictions)) / len(actuals), 4)

    @staticmethod
    def _rmse(actuals: List[float], predictions: List[float]) -> Optional[float]:
        if not actuals or len(actuals) != len(predictions):
            return None
        mse = sum((a - p) ** 2 for a, p in zip(actuals, predictions)) / len(actuals)
        return round(math.sqrt(mse), 4)

    @staticmethod
    def _r2(actuals: List[float], predictions: List[float]) -> Optional[float]:
        if not actuals or len(actuals) != len(predictions):
            return None
        mean_actual = sum(actuals) / len(actuals)
        ss_res = sum((a - p) ** 2 for a, p in zip(actuals, predictions))
        ss_tot = sum((a - mean_actual) ** 2 for a in actuals)
        if ss_tot == 0:
            return 0.0
        return round(1 - (ss_res / ss_tot), 4)

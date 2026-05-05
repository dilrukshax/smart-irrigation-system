"""Feedback loop accuracy and outcome aggregation."""

from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.data.models_orm import Field
from app.data.repositories import CropOutcomeRepository


class FeedbackService:
    @staticmethod
    def compute_accuracy_report(
        season: str,
        scheme_id: Optional[str],
        db: Session,
    ) -> Dict[str, Any]:
        rows = CropOutcomeRepository.get_prediction_vs_actual(db, season=season, scheme_id=scheme_id)
        if scheme_id:
            allowed = {
                field_id
                for (field_id,) in db.query(Field.id).filter(Field.scheme_id == scheme_id).all()
            }
            rows = [row for row in rows if row.get("field_id") in allowed]

        buckets: Dict[str, Dict[str, Any]] = defaultdict(
            lambda: {
                "crop_id": "",
                "n": 0,
                "predicted_sum": 0.0,
                "actual_sum": 0.0,
                "abs_error_sum": 0.0,
                "bias_sum": 0.0,
            }
        )

        for row in rows:
            crop_id = str(row.get("actual_crop_id") or row.get("crop_id") or "")
            actual = row.get("actual_yield_t_ha")
            predicted = row.get("predicted_yield_t_ha")
            if crop_id == "" or actual is None or predicted is None:
                continue
            actual_f = float(actual)
            predicted_f = float(predicted)
            bucket = buckets[crop_id]
            bucket["crop_id"] = crop_id
            bucket["n"] += 1
            bucket["predicted_sum"] += predicted_f
            bucket["actual_sum"] += actual_f
            bucket["abs_error_sum"] += abs(predicted_f - actual_f)
            bucket["bias_sum"] += predicted_f - actual_f

        items = []
        for bucket in buckets.values():
            n = int(bucket["n"])
            if n == 0:
                continue
            items.append(
                {
                    "crop_id": bucket["crop_id"],
                    "n": n,
                    "predicted_avg": round(bucket["predicted_sum"] / n, 3),
                    "actual_avg": round(bucket["actual_sum"] / n, 3),
                    "mae": round(bucket["abs_error_sum"] / n, 3),
                    "bias": round(bucket["bias_sum"] / n, 3),
                }
            )

        total_n = sum(item["n"] for item in items)
        weighted_mae = (
            sum(item["mae"] * item["n"] for item in items) / total_n
            if total_n
            else None
        )
        return {
            "season": season,
            "scheme_id": scheme_id,
            "items": items,
            "overall_mae": round(weighted_mae, 3) if weighted_mae is not None else None,
            "sample_count": total_n,
        }

    @staticmethod
    def update_model_confidence(db: Session) -> Dict[str, Any]:
        latest_rows = CropOutcomeRepository.get_prediction_vs_actual(db, season=None, scheme_id=None)
        recent_errors: List[float] = []
        for row in latest_rows[-50:]:
            actual = row.get("actual_yield_t_ha")
            predicted = row.get("predicted_yield_t_ha")
            if actual is None or predicted is None:
                continue
            recent_errors.append(abs(float(predicted) - float(actual)))
        if not recent_errors:
            return {"sample_count": 0, "confidence_multiplier": 1.0}
        mae = sum(recent_errors) / len(recent_errors)
        confidence_multiplier = max(0.4, min(1.0, 1.0 - (mae / 10.0)))
        return {
            "sample_count": len(recent_errors),
            "recent_mae": round(mae, 3),
            "confidence_multiplier": round(confidence_multiplier, 3),
        }

"""Scheme-level oversupply and price-crash alerting."""

from __future__ import annotations

from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.data.repositories import (
    FieldRepository,
    RecommendationRepository,
    SchemeOversupplyRepository,
)
from app.services import farmer_service

OVERSUPPLY_WARNING_PCT = 40.0
OVERSUPPLY_CRITICAL_PCT = 55.0


class OversupplyService:
    @staticmethod
    def evaluate_scheme(
        scheme_id: str,
        season: str,
        db: Session,
    ) -> List[Dict[str, Any]]:
        fields = {row["id"]: row for row in FieldRepository.list_fields(db, scheme_id=scheme_id)}
        latest = RecommendationRepository.list_latest_by_field(db, season=season, scheme_id=scheme_id)
        total_area = sum(float(field.get("area_ha") or 0.0) for field in fields.values())
        if total_area <= 0:
            return []

        crop_buckets: Dict[str, Dict[str, Any]] = {}
        for record in latest:
            field = fields.get(record.get("field_id"))
            if not field:
                continue
            crop_id, crop_name = OversupplyService._selected_crop(record)
            if not crop_id:
                continue
            bucket = crop_buckets.setdefault(
                crop_id,
                {"crop_id": crop_id, "crop_name": crop_name or crop_id, "area_allocated_ha": 0.0},
            )
            bucket["area_allocated_ha"] += float(field.get("area_ha") or 0.0)

        alerts: List[Dict[str, Any]] = []
        for crop_id, bucket in crop_buckets.items():
            pct_of_scheme = (bucket["area_allocated_ha"] / total_area) * 100.0
            if pct_of_scheme < OVERSUPPLY_WARNING_PCT:
                continue

            severity = "critical" if pct_of_scheme >= OVERSUPPLY_CRITICAL_PCT else "warning"
            threshold = OVERSUPPLY_CRITICAL_PCT if severity == "critical" else OVERSUPPLY_WARNING_PCT
            price_trend_pct = OversupplyService._price_trend_pct(db, crop_id)
            alert_id = SchemeOversupplyRepository.save_alert(
                db,
                scheme_id=scheme_id,
                season=season,
                crop_id=crop_id,
                crop_name=bucket["crop_name"],
                area_allocated_ha=round(bucket["area_allocated_ha"], 3),
                pct_of_scheme=round(pct_of_scheme, 2),
                alert_threshold_pct=threshold,
                price_trend_pct=price_trend_pct,
                severity=severity,
            )
            alerts.append(
                {
                    "id": alert_id,
                    "scheme_id": scheme_id,
                    "season": season,
                    "crop_id": crop_id,
                    "crop_name": bucket["crop_name"],
                    "area_allocated_ha": round(bucket["area_allocated_ha"], 3),
                    "pct_of_scheme": round(pct_of_scheme, 2),
                    "alert_threshold_pct": threshold,
                    "price_trend_pct": price_trend_pct,
                    "severity": severity,
                    "resolved": False,
                }
            )
        return alerts

    @staticmethod
    def _selected_crop(record: Dict[str, Any]) -> tuple[str | None, str | None]:
        response_data = record.get("response_data") or {}
        selected_crop_id = record.get("selected_crop_id")
        recommendations = response_data.get("recommendations") or []
        if selected_crop_id:
            for item in recommendations:
                if str(item.get("crop_id")) == str(selected_crop_id):
                    return str(selected_crop_id), item.get("crop_name")
            crop_meta = response_data.get("selected_crop")
            if isinstance(crop_meta, dict):
                return str(selected_crop_id), crop_meta.get("crop_name")
        top = recommendations[0] if recommendations else {}
        crop_id = top.get("crop_id")
        crop_name = top.get("crop_name")
        return (str(crop_id), crop_name) if crop_id else (None, None)

    @staticmethod
    def _price_trend_pct(db: Session, crop_id: str) -> float | None:
        history = farmer_service.fetch_price_history(db, crop_id, weeks=8)
        if len(history) < 2:
            return None
        start = float(history[0].get("price_per_kg") or 0.0)
        end = float(history[-1].get("price_per_kg") or 0.0)
        if start <= 0:
            return None
        return round(((end - start) / start) * 100.0, 2)

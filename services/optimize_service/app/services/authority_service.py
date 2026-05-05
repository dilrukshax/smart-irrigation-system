"""Authority-facing aggregate dashboards for F4."""

from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.data.repositories import CropRepository, FieldRepository, RecommendationRepository


class AuthorityService:
    @staticmethod
    def get_scheme_dashboard(scheme_id: str, season: str, db: Session) -> Dict[str, Any]:
        fields = FieldRepository.list_fields(db, scheme_id=scheme_id)
        field_map = {field["id"]: field for field in fields}
        latest = RecommendationRepository.list_latest_by_field(db, season=season, scheme_id=scheme_id)

        water_values: List[float] = []
        compliant = 0
        paddy_eligible = 0
        paddy_compliant = 0
        supply: Dict[str, Dict[str, float | str]] = defaultdict(
            lambda: {"crop_id": "", "crop_name": "Unknown", "expected_supply_t": 0.0, "area_ha": 0.0}
        )

        for record in latest:
            field = field_map.get(record.get("field_id"))
            if not field:
                continue
            area = float(field.get("area_ha") or 0.0)
            response_data = record.get("response_data") or {}
            recommendations = response_data.get("recommendations") or []
            if not recommendations:
                continue

            top = recommendations[0]
            selected_crop_id = record.get("selected_crop_id") or top.get("crop_id")
            selected = next(
                (item for item in recommendations if str(item.get("crop_id")) == str(selected_crop_id)),
                top,
            )
            water_values.append(float(selected.get("water_requirement_mm") or 0.0) * area)
            if selected_crop_id == top.get("crop_id"):
                compliant += 1

            if AuthorityService._is_paddy_designated(field):
                paddy_eligible += 1
                if str(selected.get("crop_name") or "").lower() == "paddy" or str(selected_crop_id).lower() == "paddy":
                    paddy_compliant += 1

            crop_id = str(selected.get("crop_id") or selected_crop_id or "")
            if not crop_id:
                continue
            crop_name = str(selected.get("crop_name") or crop_id)
            base_yield = float(selected.get("predicted_yield_t_ha") or selected.get("expected_yield_t_per_ha") or 0.0)
            bucket = supply[crop_id]
            bucket["crop_id"] = crop_id
            bucket["crop_name"] = crop_name
            bucket["area_ha"] = float(bucket["area_ha"]) + area
            bucket["expected_supply_t"] = float(bucket["expected_supply_t"]) + (area * base_yield)

        total_fields = len(latest)
        return {
            "scheme_id": scheme_id,
            "season": season,
            "field_count": len(fields),
            "recommendation_count": total_fields,
            "water_fairness_index": round(AuthorityService._gini_coefficient(water_values), 4),
            "scheme_compliance_pct": round((compliant / total_fields) * 100.0, 2) if total_fields else 0.0,
            "paddy_compliance_pct": round((paddy_compliant / paddy_eligible) * 100.0, 2) if paddy_eligible else 0.0,
            "expected_supply_by_crop": [
                {
                    "crop_id": bucket["crop_id"],
                    "crop_name": bucket["crop_name"],
                    "area_ha": round(float(bucket["area_ha"]), 3),
                    "expected_supply_t": round(float(bucket["expected_supply_t"]), 3),
                }
                for bucket in supply.values()
            ],
        }

    @staticmethod
    def get_national_supply_projection(season: str, db: Session) -> Dict[str, Any]:
        records = RecommendationRepository.list_latest_by_field(db, season=season, limit=5000)
        fields = {field["id"]: field for field in FieldRepository.list_fields(db)}
        buckets: Dict[str, Dict[str, float | str]] = defaultdict(
            lambda: {"crop_id": "", "crop_name": "Unknown", "area_ha": 0.0, "expected_supply_t": 0.0}
        )
        for record in records:
            field = fields.get(record.get("field_id"))
            if not field:
                continue
            area = float(field.get("area_ha") or 0.0)
            response = record.get("response_data") or {}
            recommendations = response.get("recommendations") or []
            if not recommendations:
                continue
            selected_crop_id = record.get("selected_crop_id") or recommendations[0].get("crop_id")
            selected = next(
                (item for item in recommendations if str(item.get("crop_id")) == str(selected_crop_id)),
                recommendations[0],
            )
            crop_id = str(selected.get("crop_id") or selected_crop_id or "")
            if not crop_id:
                continue
            bucket = buckets[crop_id]
            bucket["crop_id"] = crop_id
            bucket["crop_name"] = str(selected.get("crop_name") or crop_id)
            bucket["area_ha"] = float(bucket["area_ha"]) + area
            bucket["expected_supply_t"] = float(bucket["expected_supply_t"]) + area * float(
                selected.get("predicted_yield_t_ha") or selected.get("expected_yield_t_per_ha") or 0.0
            )
        return {
            "season": season,
            "items": [
                {
                    "crop_id": bucket["crop_id"],
                    "crop_name": bucket["crop_name"],
                    "area_ha": round(float(bucket["area_ha"]), 3),
                    "expected_supply_t": round(float(bucket["expected_supply_t"]), 3),
                }
                for bucket in buckets.values()
            ],
        }

    @staticmethod
    def _gini_coefficient(values: List[float]) -> float:
        clean = sorted(float(v) for v in values if v is not None and float(v) >= 0.0)
        n = len(clean)
        if n == 0:
            return 0.0
        total = sum(clean)
        if total == 0:
            return 0.0
        cumulative = 0.0
        weighted = 0.0
        for idx, value in enumerate(clean, start=1):
            cumulative += value
            weighted += cumulative
        gini = (n + 1 - 2 * (weighted / total)) / n
        return max(0.0, min(1.0, gini))

    @staticmethod
    def _is_paddy_designated(field: Dict[str, Any]) -> bool:
        soil = str(field.get("soil_type") or "").lower()
        water = float(field.get("water_availability_mm") or 0.0)
        return "clay" in soil or water >= 700.0

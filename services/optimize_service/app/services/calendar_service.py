"""Crop calendar generation and persistence helpers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.data.repositories import CropCalendarRepository
from app.services import farmer_service


@dataclass
class CropCalendarService:
    """Generate a simple agronomic calendar for a recommended crop."""

    DEFAULT_STAGE_SPLITS = (0.2, 0.3, 0.3, 0.2)
    DEFAULT_STAGE_LABELS = ("Initial", "Development", "Mid-season", "Late season")

    @staticmethod
    def season_start_date(season: str) -> date:
        parsed = farmer_service.parse_season(season)
        year = int(parsed["year"])
        if str(parsed["name"]).lower() == "yala":
            return date(year, 4, 1)
        return date(year, 10, 1)

    @classmethod
    def generate_calendar(
        cls,
        crop: Dict[str, Any],
        field: Dict[str, Any],
        season: str,
        planting_date: Optional[date],
        recommendation_id: Optional[int],
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        season_start = cls.season_start_date(season)
        planting_anchor = planting_date or season_start
        planting_window_start = season_start - timedelta(days=14)
        planting_window_end = season_start + timedelta(days=14)

        growth_days = int(crop.get("growth_duration_days") or 120)
        kc_curve = crop.get("kc_curve") or crop.get("kc_curve_ref") or {}
        irrigation_windows = cls._build_irrigation_windows(
            planting_anchor=planting_anchor,
            growth_days=growth_days,
            water_requirement_mm=float(crop.get("water_requirement_mm") or 500.0),
            kc_curve=kc_curve,
        )
        fertilizer_windows = cls._build_fertilizer_windows(planting_anchor)

        harvest_anchor = planting_anchor + timedelta(days=growth_days)
        harvest_window_start = harvest_anchor - timedelta(days=7)
        harvest_window_end = harvest_anchor + timedelta(days=7)
        market_year, market_week, _ = harvest_anchor.isocalendar()
        expected_market_week = f"{market_year}-W{market_week:02d}"

        payload = {
            "recommendation_id": recommendation_id,
            "field_id": str(field.get("id") or field.get("field_id") or ""),
            "crop_id": str(crop.get("id") or crop.get("crop_id") or ""),
            "season": season,
            "planting_window_start": planting_window_start,
            "planting_window_end": planting_window_end,
            "irrigation_windows": irrigation_windows,
            "fertilizer_windows": fertilizer_windows,
            "harvest_window_start": harvest_window_start,
            "harvest_window_end": harvest_window_end,
            "expected_market_week": expected_market_week,
        }

        if db is not None:
            calendar_id = CropCalendarRepository.save_calendar(
                db,
                field_id=payload["field_id"],
                crop_id=payload["crop_id"],
                season=season,
                recommendation_id=recommendation_id,
                planting_window_start=planting_window_start,
                planting_window_end=planting_window_end,
                irrigation_windows=irrigation_windows,
                fertilizer_windows=fertilizer_windows,
                harvest_window_start=harvest_window_start,
                harvest_window_end=harvest_window_end,
                expected_market_week=expected_market_week,
            )
            payload["id"] = calendar_id

        return cls.serialize(payload)

    @classmethod
    def serialize(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            **payload,
            "planting_window_start": cls._iso(payload.get("planting_window_start")),
            "planting_window_end": cls._iso(payload.get("planting_window_end")),
            "harvest_window_start": cls._iso(payload.get("harvest_window_start")),
            "harvest_window_end": cls._iso(payload.get("harvest_window_end")),
        }

    @staticmethod
    def _iso(value: Any) -> Optional[str]:
        return value.isoformat() if isinstance(value, date) else value

    @classmethod
    def _build_irrigation_windows(
        cls,
        *,
        planting_anchor: date,
        growth_days: int,
        water_requirement_mm: float,
        kc_curve: Any,
    ) -> List[Dict[str, Any]]:
        stage_weights = cls._normalize_kc_curve(kc_curve)
        durations = [max(1, round(growth_days * split)) for split in cls.DEFAULT_STAGE_SPLITS]
        correction = growth_days - sum(durations)
        durations[-1] += correction

        total_weight = sum(stage_weights) or 1.0
        windows: List[Dict[str, Any]] = []
        cursor = planting_anchor
        for label, duration, weight in zip(cls.DEFAULT_STAGE_LABELS, durations, stage_weights):
            end = cursor + timedelta(days=duration - 1)
            windows.append(
                {
                    "label": label,
                    "start": cursor.isoformat(),
                    "end": end.isoformat(),
                    "kc": round(weight, 2),
                    "target_mm": round(water_requirement_mm * (weight / total_weight), 1),
                }
            )
            cursor = end + timedelta(days=1)
        return windows

    @classmethod
    def _normalize_kc_curve(cls, kc_curve: Any) -> List[float]:
        if isinstance(kc_curve, list):
            values = [float(item.get("kc") if isinstance(item, dict) else item) for item in kc_curve]
            if len(values) >= 4:
                return values[:4]
        if isinstance(kc_curve, dict):
            ordered = []
            for key in ("initial", "development", "mid", "late"):
                value = kc_curve.get(key)
                if value is not None:
                    ordered.append(float(value))
            if len(ordered) >= 4:
                return ordered[:4]
        return [0.7, 0.95, 1.1, 0.8]

    @staticmethod
    def _build_fertilizer_windows(planting_anchor: date) -> List[Dict[str, Any]]:
        windows = [
            ("Basal", 0, 7),
            ("Top-dress 1", 28, 35),
            ("Top-dress 2", 56, 63),
        ]
        return [
            {
                "label": label,
                "start": (planting_anchor + timedelta(days=start)).isoformat(),
                "end": (planting_anchor + timedelta(days=end)).isoformat(),
            }
            for label, start, end in windows
        ]

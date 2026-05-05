"""Evaluate and fire automatic Plan B recomputation triggers."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.schemas import PlanBRequest
from app.data.models_orm import Recommendation
from app.data.repositories import PlanBTriggerRepository, RecommendationRepository, RunArtifactRepository
from app.services import farmer_service
from app.services.cross_service_fusion import fetch_f3_drought_risk
from app.services.planb_service import PlanBService

logger = logging.getLogger(__name__)

DROUGHT_RISK_THRESHOLD = 0.70
RESERVOIR_LOW_PCT_THRESHOLD = 30.0
PRICE_DROP_THRESHOLD_PCT = 20.0


class PlanBTriggerService:
    """Evaluates trigger signals and persists auto-triggered Plan B runs."""

    def __init__(self) -> None:
        self._planb = PlanBService()

    async def evaluate_triggers(
        self,
        field_id: str,
        season: str,
        db: Session,
        *,
        irrigation_service_url: Optional[str] = None,
        forecasting_service_url: Optional[str] = None,
        auth_header: Optional[str] = None,
        current_price_overrides: Optional[Dict[str, float]] = None,
    ) -> List[Dict[str, Any]]:
        from app.core.config import get_settings

        settings = get_settings()
        irr_url = irrigation_service_url or settings.irrigation_service_url
        fc_url = forecasting_service_url or settings.forecasting_service_url

        previous_rec = self._latest_recommendation(db, field_id, season)
        previous_crop = self._current_crop(previous_rec)
        fired: List[Dict[str, Any]] = []

        drought_risk = await fetch_f3_drought_risk(fc_url, auth_header=auth_header) if fc_url else None
        if drought_risk is not None and drought_risk > DROUGHT_RISK_THRESHOLD:
            event = self._fire_planb(
                db=db,
                field_id=field_id,
                season=season,
                trigger_type="drought_risk",
                trigger_value=drought_risk,
                threshold_value=DROUGHT_RISK_THRESHOLD,
                previous_crop_id=previous_crop,
                request=PlanBRequest(field_id=field_id, season=season),
                trigger_reason="drought_risk",
            )
            fired.append(event)

        reservoir_level = None
        if irr_url:
            reservoir = await farmer_service.fetch_reservoir_snapshot(irr_url, auth_header=auth_header)
            if isinstance(reservoir, dict):
                for key in ("water_level_pct", "active_storage_pct", "current_level_pct", "reservoir_fill_pct", "fill_pct"):
                    value = reservoir.get(key) or (reservoir.get("data") or {}).get(key)
                    if value is not None:
                        reservoir_level = float(value)
                        break
        if reservoir_level is not None and reservoir_level < RESERVOIR_LOW_PCT_THRESHOLD:
            event = self._fire_planb(
                db=db,
                field_id=field_id,
                season=season,
                trigger_type="reservoir_low",
                trigger_value=reservoir_level,
                threshold_value=RESERVOIR_LOW_PCT_THRESHOLD,
                previous_crop_id=previous_crop,
                request=PlanBRequest(
                    field_id=field_id,
                    season=season,
                    updated_quota_mm=max(200.0, reservoir_level * 10.0),
                ),
                trigger_reason="reservoir_low",
            )
            fired.append(event)

        if current_price_overrides:
            for crop_id, current_price in current_price_overrides.items():
                drop_pct = self._compute_price_drop_pct(previous_rec, crop_id, current_price)
                if drop_pct is None or drop_pct <= PRICE_DROP_THRESHOLD_PCT:
                    continue
                event = self._fire_planb(
                    db=db,
                    field_id=field_id,
                    season=season,
                    trigger_type="price_crash",
                    trigger_value=drop_pct,
                    threshold_value=PRICE_DROP_THRESHOLD_PCT,
                    previous_crop_id=crop_id,
                    request=PlanBRequest(
                        field_id=field_id,
                        season=season,
                        updated_prices={crop_id: current_price},
                    ),
                    trigger_reason="price_crash",
                )
                fired.append(event)

        return fired

    def _fire_planb(
        self,
        *,
        db: Session,
        field_id: str,
        season: str,
        trigger_type: str,
        trigger_value: float,
        threshold_value: float,
        previous_crop_id: Optional[str],
        request: PlanBRequest,
        trigger_reason: str,
    ) -> Dict[str, Any]:
        response = self._planb.recompute_plan(request=request, db_session=db, trigger_reason=trigger_reason)
        new_crop_id = response.adjusted_plan[0].crop_id if response.adjusted_plan else None
        planb_recommendation_id = RecommendationRepository.save_recommendation(
            db_session=db,
            field_id=field_id,
            season=season,
            request_data=request.model_dump(),
            response_data=response.model_dump(),
            selected_crop_id=new_crop_id,
        )
        RunArtifactRepository.save_artifact(
            db,
            run_type="planb_auto",
            field_id=field_id,
            season=season,
            request_payload=request.model_dump(),
            response_payload=response.model_dump(),
            status=response.status,
            source=response.source,
            data_available=response.data_available,
            observed_at=None,
        )
        PlanBTriggerRepository.save_trigger(
            db,
            field_id=field_id,
            season=season,
            trigger_type=trigger_type,
            trigger_value=trigger_value,
            threshold_value=threshold_value,
            previous_crop_id=previous_crop_id,
            new_crop_id=new_crop_id,
            plan_b_recommendation_id=planb_recommendation_id,
        )
        return {
            "field_id": field_id,
            "season": season,
            "trigger_type": trigger_type,
            "trigger_value": round(trigger_value, 3),
            "threshold_value": threshold_value,
            "previous_crop_id": previous_crop_id,
            "new_crop_id": new_crop_id,
            "plan_b_recommendation_id": planb_recommendation_id,
            "notified": False,
        }

    @staticmethod
    def _latest_recommendation(db: Session, field_id: str, season: str) -> Optional[Recommendation]:
        return (
            db.query(Recommendation)
            .filter(Recommendation.field_id == field_id, Recommendation.season == season)
            .order_by(Recommendation.created_at.desc(), Recommendation.id.desc())
            .first()
        )

    @staticmethod
    def _current_crop(record: Optional[Recommendation]) -> Optional[str]:
        if record is None:
            return None
        if record.selected_crop_id:
            return str(record.selected_crop_id)
        payload = record.response_data if isinstance(record.response_data, dict) else {}
        recommendations = payload.get("recommendations") or []
        if recommendations:
            return recommendations[0].get("crop_id")
        return None

    @staticmethod
    def _compute_price_drop_pct(
        record: Optional[Recommendation],
        crop_id: str,
        current_price_per_kg: float,
    ) -> Optional[float]:
        if record is None or not isinstance(record.response_data, dict):
            return None
        recommendations = record.response_data.get("recommendations") or []
        for item in recommendations:
            if str(item.get("crop_id")) != str(crop_id):
                continue
            previous = item.get("predicted_price_per_kg") or item.get("price_per_kg")
            if previous is None:
                return None
            previous_f = float(previous)
            if previous_f <= 0:
                return None
            return round(((previous_f - float(current_price_per_kg)) / previous_f) * 100.0, 3)
        return None

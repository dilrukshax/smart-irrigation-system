"""
Health Analysis API Routes.
Endpoints for satellite-based health analysis and zone health mapping.

Scientific workflow:
1. Validate vegetation coverage (≥90% required)
2. Reject non-agricultural areas (sea, urban, buildings)
3. Only proceed with analysis for valid areas
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from typing import Any, Dict, List, Optional
from datetime import datetime
import json
import logging
import os

from app.schemas.analysis import SatelliteAnalysisRequest, SatelliteAnalysisResponse
from app.schemas.zone import HealthMapResponse, ZoneSummary, HealthZoneCollection
from app.services.satellite_analyzer import get_satellite_analyzer
from app.services.zone_generator import get_zone_generator
from app.services.vegetation_validator import ValidationStatus
from app.core.config import settings
from app.dependencies.auth import require_admin
from app.db import stress_repo
from pydantic import BaseModel, Field

try:
    import paho.mqtt.client as mqtt
except Exception:  # pragma: no cover - optional dependency at runtime
    mqtt = None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/crop-health", tags=["Crop Health Analysis"])


MILD_STRESS_ALERT_RATIO = 0.25
SEVERE_STRESS_ALERT_RATIO = 0.15
LOW_NDVI_ALERT_THRESHOLD = 0.45
LOW_NDWI_ALERT_THRESHOLD = 0.05


def _priority_rank(priority: str) -> int:
    return {"critical": 4, "high": 3, "medium": 2, "low": 1}.get(str(priority or "").lower(), 0)


def _make_crop_alert(
    *,
    alert_type: str,
    priority: str,
    title: str,
    message: str,
    recommendation: str,
    source: str,
    field_id: Optional[str] = None,
    metric: Optional[str] = None,
    value: Optional[float] = None,
    generated_at: Optional[str] = None,
) -> Dict[str, Any]:
    observed = generated_at or datetime.utcnow().isoformat()
    scope = field_id or "scheme"
    return {
        "id": f"{alert_type.lower()}-{scope}-{observed[:10]}",
        "type": alert_type,
        "priority": priority,
        "severity": priority.upper(),
        "title": title,
        "message": message,
        "recommendation": recommendation,
        "field_id": field_id,
        "metric": metric,
        "value": round(value, 3) if isinstance(value, (int, float)) else value,
        "generated_at": observed,
        "source": source,
    }


def _alerts_from_zone_summary(summary: ZoneSummary) -> List[Dict[str, Any]]:
    total = max(summary.total_zones, 1)
    mild_ratio = summary.mild_stress_count / total
    severe_ratio = summary.severe_stress_count / total
    alerts: List[Dict[str, Any]] = []

    if summary.severe_stress_count > 0 and severe_ratio >= SEVERE_STRESS_ALERT_RATIO:
        priority = "critical" if severe_ratio >= 0.35 else "high"
        alerts.append(
            _make_crop_alert(
                alert_type="SEVERE_STRESS_ZONES",
                priority=priority,
                title="Severe crop stress zones detected",
                message=f"{summary.severe_stress_count} of {summary.total_zones} zones are classified as severe stress.",
                recommendation="Prioritize field inspection, irrigation checks, and pest or disease scouting for severe zones.",
                source="zone-summary",
                metric="severe_stress_ratio",
                value=severe_ratio,
                generated_at=summary.last_updated.isoformat(),
            )
        )

    if summary.mild_stress_count > 0 and mild_ratio >= MILD_STRESS_ALERT_RATIO:
        alerts.append(
            _make_crop_alert(
                alert_type="MILD_STRESS_SPREAD",
                priority="medium",
                title="Mild crop stress spreading",
                message=f"{summary.mild_stress_count} zones are showing mild stress signatures.",
                recommendation="Increase monitoring frequency and compare against recent irrigation telemetry.",
                source="zone-summary",
                metric="mild_stress_ratio",
                value=mild_ratio,
                generated_at=summary.last_updated.isoformat(),
            )
        )

    if summary.average_ndvi < LOW_NDVI_ALERT_THRESHOLD:
        alerts.append(
            _make_crop_alert(
                alert_type="LOW_NDVI",
                priority="high",
                title="Low average NDVI",
                message="Scheme-level average NDVI is below the crop-health threshold.",
                recommendation="Review affected zones and confirm whether this is water stress, disease, or crop-stage related.",
                source="zone-summary",
                metric="average_ndvi",
                value=summary.average_ndvi,
                generated_at=summary.last_updated.isoformat(),
            )
        )

    if summary.average_ndwi < LOW_NDWI_ALERT_THRESHOLD:
        alerts.append(
            _make_crop_alert(
                alert_type="LOW_NDWI",
                priority="medium",
                title="Low canopy water index",
                message="Average NDWI suggests elevated water stress risk.",
                recommendation="Cross-check soil-moisture telemetry and schedule irrigation for high-priority zones.",
                source="zone-summary",
                metric="average_ndwi",
                value=summary.average_ndwi,
                generated_at=summary.last_updated.isoformat(),
            )
        )

    return alerts


def _alerts_from_stress_artifacts(artifacts: Dict[str, dict]) -> List[Dict[str, Any]]:
    alerts: List[Dict[str, Any]] = []
    for field_id, artifact in artifacts.items():
        priority = str(artifact.get("priority") or "low").lower()
        stress_index = float(artifact.get("stress_index") or 0)
        severe_ratio = float(artifact.get("severe_stress_ratio") or 0)
        if priority not in {"medium", "high", "critical"} and stress_index < 0.3 and severe_ratio < 0.15:
            continue

        alert_priority = priority if priority in {"medium", "high", "critical"} else "medium"
        alerts.append(
            _make_crop_alert(
                alert_type="FIELD_STRESS",
                priority=alert_priority,
                title=f"{alert_priority.title()} field stress",
                message=f"Field {field_id} has stress index {stress_index:.2f}.",
                recommendation=artifact.get("recommended_action") or "Inspect the field and compare against irrigation telemetry.",
                source=str(artifact.get("source") or "analysis-artifact"),
                field_id=field_id,
                metric="stress_index",
                value=stress_index,
                generated_at=artifact.get("observed_at") or artifact.get("generated_at"),
            )
        )
    return alerts


class FieldStressSummary(BaseModel):
    """Field-level stress aggregate for cross-service consumers."""

    field_id: str = Field(..., description="Field identifier")
    generated_at: str = Field(..., description="Generation timestamp")
    stress_index: float = Field(..., ge=0, le=1, description="Aggregated stress index")
    priority: str = Field(..., description="Priority band: low|medium|high|critical")
    stress_penalty_factor: float = Field(..., ge=0, le=1, description="Penalty factor for planning")
    healthy_ratio: float = Field(..., ge=0, le=1)
    mild_stress_ratio: float = Field(..., ge=0, le=1)
    severe_stress_ratio: float = Field(..., ge=0, le=1)
    recommended_action: str = Field(..., description="Suggested field-level action")
    source: str = Field(default="zone-summary")
    status: str = Field(default="ok", description="ok|stale|analysis_pending|data_unavailable|source_unavailable")
    is_live: bool = Field(default=True)
    observed_at: Optional[str] = None
    staleness_sec: Optional[float] = None
    quality: str = Field(default="good")
    data_available: bool = Field(default=True)
    message: Optional[str] = None


_analysis_artifacts: dict = {}


def _persist_artifact(field_id: str, payload: dict) -> None:
    """Upsert a single field's artifact via the repository."""
    _analysis_artifacts[field_id] = payload
    try:
        stress_repo.upsert_summary(field_id, payload)
    except Exception as exc:
        logger.warning("Failed to persist stress artifact for %s: %s", field_id, exc)


def _load_artifacts() -> None:
    """Load all artifacts from repository into the in-memory cache."""
    try:
        _analysis_artifacts.clear()
        _analysis_artifacts.update(stress_repo.load_all())
    except Exception as exc:
        logger.warning("Failed to load analysis artifacts: %s", exc)


def _summary_to_stress(field_id: str, summary: ZoneSummary) -> FieldStressSummary:
    total = max(summary.total_zones, 1)
    healthy_ratio = summary.healthy_count / total
    mild_ratio = summary.mild_stress_count / total
    severe_ratio = summary.severe_stress_count / total
    stress_index = min(1.0, (mild_ratio * 0.5) + severe_ratio)

    if stress_index >= 0.75 or severe_ratio >= 0.45:
        priority = "critical"
        action = "Immediate irrigation and field inspection required"
    elif stress_index >= 0.5:
        priority = "high"
        action = "Prioritize irrigation schedule and stress mitigation"
    elif stress_index >= 0.3:
        priority = "medium"
        action = "Increase monitoring frequency and tune irrigation"
    else:
        priority = "low"
        action = "Maintain current irrigation plan"

    penalty = round(min(0.6, stress_index * 0.5), 3)
    observed = datetime.utcnow().isoformat()
    return FieldStressSummary(
        field_id=field_id,
        generated_at=observed,
        stress_index=round(stress_index, 3),
        priority=priority,
        stress_penalty_factor=penalty,
        healthy_ratio=round(healthy_ratio, 3),
        mild_stress_ratio=round(mild_ratio, 3),
        severe_stress_ratio=round(severe_ratio, 3),
        recommended_action=action,
        source="analysis-artifact",
        status="ok",
        is_live=True,
        observed_at=observed,
        staleness_sec=0.0,
        quality="good",
        data_available=True,
        message="Stress summary generated from zone analysis",
    )


def _apply_stress_contract_defaults(summary: FieldStressSummary) -> FieldStressSummary:
    payload = summary.model_dump()
    observed_at = payload.get("observed_at") or payload.get("generated_at")
    payload["observed_at"] = observed_at

    if payload.get("staleness_sec") is None and observed_at:
        try:
            observed = datetime.fromisoformat(str(observed_at).replace("Z", "+00:00")).replace(tzinfo=None)
            payload["staleness_sec"] = round((datetime.utcnow() - observed).total_seconds(), 2)
        except Exception:
            payload["staleness_sec"] = None

    if payload.get("message") is None:
        payload["message"] = "Stress summary available" if payload.get("data_available") else "Stress summary unavailable"

    return FieldStressSummary(**payload)


# Initialize persistence (DB schema if enabled, then load existing artifacts)
stress_repo.init_schema()
_load_artifacts()


def _emit_stress_event(summary: FieldStressSummary) -> None:
    """Emit crop.stress.v1 event for downstream consumers."""
    if mqtt is None:
        return
    client = mqtt.Client(client_id=f"crop-health-{summary.field_id}")
    payload = {
        "event": "crop.stress.v1",
        "occurred_at": datetime.utcnow().isoformat(),
        **summary.model_dump(),
    }
    try:
        client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, keepalive=10)
        client.publish("events/crop.stress.v1", json.dumps(payload), qos=1)
    except Exception as exc:
        logger.debug("Skipping crop.stress.v1 publish: %s", exc)
    finally:
        try:
            client.disconnect()
        except Exception:
            pass


@router.post(
    "/analyze",
    response_model=HealthMapResponse,
    summary="Analyze area satellite data",
    description="""
    Perform satellite-based crop health analysis for a specified area.
    
    **VALIDATION RULES:**
    - Vegetation coverage must be ≥90%
    - Non-agricultural areas (sea, urban, buildings) will be rejected
    - Areas with high cloud cover (>30%) will be rejected
    
    Returns health zones with NDVI/NDWI classifications for valid areas,
    or an error response explaining why the location was rejected.
    """
)
async def analyze_satellite_data(request: SatelliteAnalysisRequest):
    """
    Analyze satellite imagery for crop health assessment.
    
    - **lat**: Center latitude of the area to analyze
    - **lon**: Center longitude of the area to analyze  
    - **area_km2**: Size of the area in square kilometers
    - **num_zones**: Number of zones to divide the area into
    - **analysis_date**: Optional date for satellite image selection
    
    Returns:
    - 200: GeoJSON-compatible health zones with classifications
    - 422: Location rejected (insufficient vegetation, water body, urban area)
    - 500: Internal server error
    """
    try:
        if settings.is_strict_live_data:
            return JSONResponse(
                status_code=503,
                content={
                    "success": False,
                    "error": "SOURCE_UNAVAILABLE",
                    "status": "source_unavailable",
                    "message": "Strict live-data mode is enabled; simulated satellite analysis is disabled.",
                    "source": "unavailable",
                    "is_live": False,
                    "data_available": False,
                },
            )

        logger.info(f"Analyzing area at ({request.lat}, {request.lon}), "
                   f"{request.area_km2} km², {request.num_zones} zones")
        
        analyzer = get_satellite_analyzer()
        map_response, analysis_response = await analyzer.analyze_area(request)
        
        # Handle validation failures with appropriate HTTP status
        if not analysis_response.success:
            validation = analysis_response.validation_result
            
            # Determine appropriate HTTP status based on validation failure
            if validation:
                validation_status = validation.get("status", "")
                
                # Provide detailed error response (422 Unprocessable Entity)
                return JSONResponse(
                    status_code=422,
                    content={
                        "success": False,
                        "error": "INVALID_LOCATION",
                        "status": validation_status,
                        "message": analysis_response.message,
                        "validation": validation,
                        "metadata": {
                            "analysis_id": analysis_response.metadata.analysis_id,
                            "timestamp": analysis_response.metadata.timestamp.isoformat(),
                            "source": analysis_response.metadata.source
                        },
                        "suggestions": _get_suggestions_for_status(validation_status)
                    }
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=analysis_response.message
                )
        
        return map_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


def _get_suggestions_for_status(status_value: str) -> list:
    """Get helpful suggestions based on validation status."""
    suggestions = {
        "WATER_BODY": [
            "Select a location on land, not over water",
            "Check that coordinates are correct",
            "Try selecting an agricultural area nearby"
        ],
        "URBAN_AREA": [
            "Select a location in an agricultural or rural area",
            "Urban areas cannot be analyzed for crop health",
            "Try selecting farmland outside the city"
        ],
        "INSUFFICIENT_VEGETATION": [
            "Select a location with more vegetation coverage",
            "At least 90% vegetation coverage is required",
            "This area may be barren, desert, or non-agricultural"
        ],
        "HIGH_CLOUD_COVER": [
            "Try a different analysis date",
            "Wait for clearer weather conditions",
            "Cloud cover exceeds 30% threshold"
        ],
        "BARREN_LAND": [
            "Select an area with vegetation",
            "This location appears to be barren or desert",
            "Try selecting an agricultural region"
        ]
    }
    return suggestions.get(status_value, [
        "Try selecting a different location",
        "Ensure the area contains agricultural land"
    ])


@router.get(
    "/zones",
    response_model=HealthMapResponse,
    summary="Get health zones for location",
    description="""
    Get health status zones for a specified location.
    
    **VALIDATION:** Location must have ≥90% vegetation coverage.
    Non-agricultural areas (sea, urban) will be rejected with 422 status.
    """
)
async def get_health_zones(
    lat: Optional[float] = Query(default=None, ge=-90, le=90, description="Center latitude"),
    lon: Optional[float] = Query(default=None, ge=-180, le=180, description="Center longitude"),
    area_km2: Optional[float] = Query(default=10.0, gt=0, le=100, description="Area in km²"),
    num_zones: Optional[int] = Query(default=6, ge=1, le=20, description="Number of zones"),
    analysis_date: Optional[datetime] = Query(default=None, description="Analysis date")
):
    """
    Get health zones for a location.
    
    Uses default Sri Lanka agricultural location if not specified.
    Validates vegetation coverage before generating zones.
    """
    # Use defaults if not provided
    center_lat = lat if lat is not None else settings.DEFAULT_LAT
    center_lon = lon if lon is not None else settings.DEFAULT_LON
    
    try:
        if settings.is_strict_live_data:
            raise HTTPException(
                status_code=503,
                detail={
                    "status": "source_unavailable",
                    "message": "Strict live-data mode is enabled; simulated zone generation is disabled.",
                    "source": "unavailable",
                    "is_live": False,
                    "data_available": False,
                },
            )

        request = SatelliteAnalysisRequest(
            lat=center_lat,
            lon=center_lon,
            area_km2=area_km2,
            num_zones=num_zones,
            analysis_date=analysis_date
        )
        
        analyzer = get_satellite_analyzer()
        map_response, analysis_response = await analyzer.analyze_area(request)
        
        # Handle validation failures
        if not analysis_response.success:
            validation = analysis_response.validation_result
            if validation:
                return JSONResponse(
                    status_code=422,  # Unprocessable Entity
                    content={
                        "success": False,
                        "error": "INVALID_LOCATION",
                        "status": validation.get("status", ""),
                        "message": analysis_response.message,
                        "validation": validation,
                        "suggestions": _get_suggestions_for_status(validation.get("status", ""))
                    }
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=analysis_response.message
            )
        
        return map_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Zone generation error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate zones: {str(e)}"
        )


@router.get(
    "/zones/geojson",
    response_model=HealthZoneCollection,
    summary="Get zones as GeoJSON",
    description="Get health zones in pure GeoJSON format for direct map integration."
)
async def get_zones_geojson(
    lat: Optional[float] = Query(default=None, ge=-90, le=90),
    lon: Optional[float] = Query(default=None, ge=-180, le=180),
    area_km2: Optional[float] = Query(default=10.0, gt=0, le=100),
    num_zones: Optional[int] = Query(default=6, ge=1, le=20)
):
    """Get zones in GeoJSON FeatureCollection format."""
    center_lat = lat if lat is not None else settings.DEFAULT_LAT
    center_lon = lon if lon is not None else settings.DEFAULT_LON
    
    try:
        if settings.is_strict_live_data:
            raise HTTPException(
                status_code=503,
                detail={
                    "status": "source_unavailable",
                    "message": "Strict live-data mode is enabled; simulated zone generation is disabled.",
                    "source": "unavailable",
                    "is_live": False,
                    "data_available": False,
                },
            )

        zone_generator = get_zone_generator()
        zones, _ = zone_generator.generate_zones(
            center_lat=center_lat,
            center_lon=center_lon,
            area_km2=area_km2,
            num_zones=num_zones
        )
        
        return zones
        
    except Exception as e:
        logger.error(f"GeoJSON generation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate GeoJSON: {str(e)}"
        )


@router.get(
    "/zones/summary",
    response_model=ZoneSummary,
    summary="Get zone health summary",
    description="Get summary statistics for health zones in an area."
)
async def get_zone_summary(
    lat: Optional[float] = Query(default=None, ge=-90, le=90),
    lon: Optional[float] = Query(default=None, ge=-180, le=180),
    area_km2: Optional[float] = Query(default=10.0, gt=0, le=100),
    num_zones: Optional[int] = Query(default=6, ge=1, le=20)
):
    """Get summary of health zone statistics."""
    center_lat = lat if lat is not None else settings.DEFAULT_LAT
    center_lon = lon if lon is not None else settings.DEFAULT_LON
    
    try:
        if settings.is_strict_live_data:
            raise HTTPException(
                status_code=503,
                detail={
                    "status": "source_unavailable",
                    "message": "Strict live-data mode is enabled; simulated zone summary is disabled.",
                    "source": "unavailable",
                    "is_live": False,
                    "data_available": False,
                },
            )

        zone_generator = get_zone_generator()
        _, summary = zone_generator.generate_zones(
            center_lat=center_lat,
            center_lon=center_lon,
            area_km2=area_km2,
            num_zones=num_zones
        )
        
        return summary
        
    except Exception as e:
        logger.error(f"Summary generation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {str(e)}"
        )


@router.get(
    "/alerts",
    summary="Get crop-health alerts",
    description="Operator-safe aggregate alerts from persisted field stress artifacts and zone summary analysis.",
)
async def get_crop_health_alerts(
    lat: Optional[float] = Query(default=None, ge=-90, le=90),
    lon: Optional[float] = Query(default=None, ge=-180, le=180),
    area_km2: Optional[float] = Query(default=10.0, gt=0, le=100),
    num_zones: Optional[int] = Query(default=6, ge=1, le=20),
):
    center_lat = lat if lat is not None else settings.DEFAULT_LAT
    center_lon = lon if lon is not None else settings.DEFAULT_LON
    generated_at = datetime.utcnow().isoformat()

    try:
        artifacts = stress_repo.load_all()
        if not artifacts:
            artifacts = dict(_analysis_artifacts)
        alerts = _alerts_from_stress_artifacts(artifacts)
        zone_summary: Optional[ZoneSummary] = None
        source = "analysis-artifact" if artifacts else "zone-summary"

        if not settings.is_strict_live_data:
            zone_generator = get_zone_generator()
            _, zone_summary = zone_generator.generate_zones(
                center_lat=center_lat,
                center_lon=center_lon,
                area_km2=area_km2,
                num_zones=num_zones,
            )
            alerts.extend(_alerts_from_zone_summary(zone_summary))
        elif not artifacts:
            return {
                "status": "analysis_pending",
                "source": "analysis-artifact",
                "is_live": False,
                "observed_at": None,
                "staleness_sec": None,
                "quality": "unknown",
                "data_available": False,
                "message": "Live crop stress alerts are not yet available",
                "generated_at": generated_at,
                "alerts": [],
                "summary": {
                    "total_alerts": 0,
                    "highest_priority": "low",
                    "artifact_count": 0,
                    "critical_fields": 0,
                    "high_fields": 0,
                    "medium_fields": 0,
                    "zone_summary": None,
                },
            }

        alerts.sort(key=lambda item: (-_priority_rank(item.get("priority", "")), item.get("generated_at") or ""))
        highest = alerts[0]["priority"] if alerts else "low"
        critical_fields = sum(
            1
            for artifact in artifacts.values()
            if str(artifact.get("priority") or "").lower() == "critical"
        )
        high_fields = sum(
            1
            for artifact in artifacts.values()
            if str(artifact.get("priority") or "").lower() == "high"
        )
        medium_fields = sum(
            1
            for artifact in artifacts.values()
            if str(artifact.get("priority") or "").lower() == "medium"
        )

        return {
            "status": "ok",
            "source": source,
            "is_live": bool(artifacts),
            "observed_at": generated_at,
            "staleness_sec": 0.0,
            "quality": "good" if artifacts else "stale",
            "data_available": True,
            "message": "Crop-health alerts generated",
            "generated_at": generated_at,
            "location": {"lat": center_lat, "lon": center_lon},
            "alerts": alerts,
            "summary": {
                "total_alerts": len(alerts),
                "highest_priority": highest,
                "artifact_count": len(artifacts),
                "critical_fields": critical_fields,
                "high_fields": high_fields,
                "medium_fields": medium_fields,
                "zone_summary": zone_summary.model_dump(mode="json") if zone_summary else None,
            },
        }
    except Exception as e:
        logger.error("Crop-health alerts generation error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate crop-health alerts: {str(e)}",
        )


@router.get(
    "/fields/{field_id}/stress-summary",
    response_model=FieldStressSummary,
    summary="Get field-level stress summary",
    description="Aggregated stress index and priority by field for F1/F4 integrations.",
)
async def get_field_stress_summary(
    field_id: str,
    lat: Optional[float] = Query(default=None, ge=-90, le=90),
    lon: Optional[float] = Query(default=None, ge=-180, le=180),
    area_km2: float = Query(default=10.0, gt=0, le=100),
    num_zones: int = Query(default=6, ge=1, le=20),
):
    center_lat = lat if lat is not None else settings.DEFAULT_LAT
    center_lon = lon if lon is not None else settings.DEFAULT_LON

    try:
        artifact = stress_repo.get_summary(field_id) or _analysis_artifacts.get(field_id)
        if artifact:
            response = FieldStressSummary(**artifact)
            return _apply_stress_contract_defaults(response)

        if settings.is_strict_live_data:
            now = datetime.utcnow().isoformat()
            return FieldStressSummary(
                field_id=field_id,
                generated_at=now,
                stress_index=0.0,
                priority="low",
                stress_penalty_factor=0.0,
                healthy_ratio=0.0,
                mild_stress_ratio=0.0,
                severe_stress_ratio=0.0,
                recommended_action="Run live satellite analysis pipeline for this field",
                source="analysis-artifact",
                status="analysis_pending",
                is_live=False,
                observed_at=None,
                staleness_sec=None,
                quality="unknown",
                data_available=False,
                message="Live stress summary is not yet available",
            )

        zone_generator = get_zone_generator()
        _, summary = zone_generator.generate_zones(
            center_lat=center_lat,
            center_lon=center_lon,
            area_km2=area_km2,
            num_zones=num_zones,
        )

        response = _summary_to_stress(field_id, summary)
        _persist_artifact(field_id, response.model_dump())

        _emit_stress_event(response)
        return _apply_stress_contract_defaults(response)

    except Exception as e:
        logger.error("Stress summary generation error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate stress summary: {str(e)}",
        )


@router.post(
    "/fields/{field_id}/stress-summary/ingest",
    summary="Ingest live field stress summary",
)
async def ingest_field_stress_summary(
    field_id: str,
    payload: FieldStressSummary,
    admin_context: dict = Depends(require_admin),
):
    """Persist externally computed live stress summary artifacts."""
    del admin_context
    summary = payload.model_copy(
        update={
            "field_id": field_id,
            "status": "ok",
            "data_available": True,
            "message": payload.message or "Live stress summary ingested",
            "observed_at": payload.observed_at or payload.generated_at,
        }
    )
    _persist_artifact(field_id, summary.model_dump())
    return {
        "status": "ok",
        "message": "Stress summary artifact stored",
        "field_id": field_id,
    }

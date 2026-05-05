"""Seed realistic demo data for irrigation and optimization dashboards.

This script is intentionally idempotent for the fixed demo IDs below. It keeps
the auth sample users seeded by ``services/auth_service/seed_admin.py`` and
populates the current irrigation/optimization schema with shared field IDs,
recent telemetry, historical records, and multi-season planning data.
"""

from __future__ import annotations

import math
import os
import random
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from dotenv import dotenv_values
from sqlalchemy import MetaData, Table, create_engine, func, select


DEMO_NAMESPACE = uuid.UUID("8dc9cfe6-1836-4f12-9732-5aa4ddb7f34e")
DEMO_SOURCE = "demo_seed_v3"
NOW = datetime.now(timezone.utc).replace(microsecond=0)
RNG = random.Random(42)

DEMO_FIELDS = [
    {
        "field_id": "field-demo-north-paddy",
        "field_name": "North Paddy Block",
        "crop_type": "paddy",
        "soil_type": "clay loam",
        "area_hectares": 3.4,
        "scheme_id": "scheme-default",
        "device_id": "ESP32_DEMO_01",
        "latitude": 6.4208,
        "longitude": 80.8894,
        "location_name": "North Canal Block A",
        "water_level_min_pct": 18.0,
        "water_level_max_pct": 88.0,
        "water_level_optimal_pct": 54.0,
        "water_level_critical_pct": 10.0,
        "soil_moisture_min_pct": 35.0,
        "soil_moisture_max_pct": 82.0,
        "soil_moisture_optimal_pct": 62.0,
        "soil_moisture_critical_pct": 28.0,
        "irrigation_duration_minutes": 42,
        "water_availability_mm": 980.0,
        "soil_ph": 6.2,
        "soil_ec": 1.2,
        "soil_suitability": 0.92,
        "elevation_m": 91.0,
        "latest_moisture": 66.0,
        "latest_water_level": 58.0,
        "stale": False,
    },
    {
        "field_id": "field-demo-east-tomato",
        "field_name": "East Tomato Terrace",
        "crop_type": "tomato",
        "soil_type": "sandy loam",
        "area_hectares": 1.8,
        "scheme_id": "scheme-default",
        "device_id": "ESP32_DEMO_02",
        "latitude": 6.4251,
        "longitude": 80.8962,
        "location_name": "East Lift Zone",
        "water_level_min_pct": 16.0,
        "water_level_max_pct": 80.0,
        "water_level_optimal_pct": 48.0,
        "water_level_critical_pct": 12.0,
        "soil_moisture_min_pct": 34.0,
        "soil_moisture_max_pct": 72.0,
        "soil_moisture_optimal_pct": 55.0,
        "soil_moisture_critical_pct": 26.0,
        "irrigation_duration_minutes": 28,
        "water_availability_mm": 540.0,
        "soil_ph": 6.5,
        "soil_ec": 1.0,
        "soil_suitability": 0.88,
        "elevation_m": 94.0,
        "latest_moisture": 51.0,
        "latest_water_level": 45.0,
        "stale": False,
    },
    {
        "field_id": "field-demo-south-chili",
        "field_name": "South Chili Ridge",
        "crop_type": "chili",
        "soil_type": "red loam",
        "area_hectares": 2.2,
        "scheme_id": "scheme-default",
        "device_id": "ESP32_DEMO_03",
        "latitude": 6.4176,
        "longitude": 80.9019,
        "location_name": "South Ridge Parcel",
        "water_level_min_pct": 12.0,
        "water_level_max_pct": 76.0,
        "water_level_optimal_pct": 41.0,
        "water_level_critical_pct": 9.0,
        "soil_moisture_min_pct": 30.0,
        "soil_moisture_max_pct": 68.0,
        "soil_moisture_optimal_pct": 49.0,
        "soil_moisture_critical_pct": 22.0,
        "irrigation_duration_minutes": 24,
        "water_availability_mm": 620.0,
        "soil_ph": 6.1,
        "soil_ec": 1.4,
        "soil_suitability": 0.83,
        "elevation_m": 96.0,
        "latest_moisture": 33.0,
        "latest_water_level": 26.0,
        "stale": False,
    },
    {
        "field_id": "field-demo-west-maize",
        "field_name": "West Maize Belt",
        "crop_type": "maize",
        "soil_type": "silty loam",
        "area_hectares": 2.7,
        "scheme_id": "scheme-default",
        "device_id": "ESP32_DEMO_04",
        "latitude": 6.4289,
        "longitude": 80.8837,
        "location_name": "West Return Channel",
        "water_level_min_pct": 15.0,
        "water_level_max_pct": 75.0,
        "water_level_optimal_pct": 44.0,
        "water_level_critical_pct": 11.0,
        "soil_moisture_min_pct": 31.0,
        "soil_moisture_max_pct": 70.0,
        "soil_moisture_optimal_pct": 51.0,
        "soil_moisture_critical_pct": 24.0,
        "irrigation_duration_minutes": 30,
        "water_availability_mm": 470.0,
        "soil_ph": 6.3,
        "soil_ec": 1.1,
        "soil_suitability": 0.79,
        "elevation_m": 92.0,
        "latest_moisture": 42.0,
        "latest_water_level": 31.0,
        "stale": True,
    },
]

DEMO_CROPS = [
    {"id": "paddy", "name": "Paddy", "category": "cereal", "growth_duration_days": 120, "water_sensitivity": "high", "base_yield_t_per_ha": 4.8, "water_requirement_mm": 1100.0, "ph_min": 5.5, "ph_max": 7.0, "ec_max": 4.0},
    {"id": "maize", "name": "Maize", "category": "cereal", "growth_duration_days": 110, "water_sensitivity": "medium", "base_yield_t_per_ha": 5.2, "water_requirement_mm": 500.0, "ph_min": 5.5, "ph_max": 7.5, "ec_max": 4.0},
    {"id": "tomato", "name": "Tomato", "category": "vegetable", "growth_duration_days": 100, "water_sensitivity": "medium", "base_yield_t_per_ha": 24.0, "water_requirement_mm": 460.0, "ph_min": 6.0, "ph_max": 7.0, "ec_max": 4.0},
    {"id": "chili", "name": "Chili", "category": "spice", "growth_duration_days": 160, "water_sensitivity": "medium", "base_yield_t_per_ha": 3.1, "water_requirement_mm": 690.0, "ph_min": 6.0, "ph_max": 7.0, "ec_max": 4.0},
    {"id": "onion", "name": "Onion", "category": "vegetable", "growth_duration_days": 110, "water_sensitivity": "medium", "base_yield_t_per_ha": 15.5, "water_requirement_mm": 410.0, "ph_min": 6.0, "ph_max": 7.0, "ec_max": 4.0},
    {"id": "green_gram", "name": "Green gram", "category": "pulse", "growth_duration_days": 75, "water_sensitivity": "low", "base_yield_t_per_ha": 1.6, "water_requirement_mm": 360.0, "ph_min": 6.5, "ph_max": 7.5, "ec_max": 4.0},
    {"id": "pumpkin", "name": "Pumpkin", "category": "vegetable", "growth_duration_days": 110, "water_sensitivity": "low", "base_yield_t_per_ha": 15.0, "water_requirement_mm": 450.0, "ph_min": 6.0, "ph_max": 7.0, "ec_max": 4.0},
    {"id": "beans", "name": "Beans", "category": "vegetable", "growth_duration_days": 85, "water_sensitivity": "medium", "base_yield_t_per_ha": 10.5, "water_requirement_mm": 400.0, "ph_min": 6.0, "ph_max": 7.5, "ec_max": 4.0},
]

SEASON_SPECS = {
    "Maha-2025": {
        "created_at": NOW - timedelta(days=180),
        "field_crops": {
            "field-demo-north-paddy": [("paddy", 0.93, "low", 5.0, 135.0, 228000.0), ("green_gram", 0.74, "low", 1.7, 290.0, 141000.0), ("maize", 0.68, "medium", 4.8, 92.0, 154000.0)],
            "field-demo-east-tomato": [("tomato", 0.91, "medium", 23.0, 182.0, 312000.0), ("onion", 0.82, "low", 14.8, 168.0, 244000.0), ("beans", 0.76, "low", 9.8, 240.0, 196000.0)],
            "field-demo-south-chili": [("chili", 0.89, "medium", 3.3, 720.0, 286000.0), ("onion", 0.81, "medium", 14.3, 158.0, 231000.0), ("pumpkin", 0.73, "low", 14.6, 96.0, 164000.0)],
            "field-demo-west-maize": [("maize", 0.86, "low", 5.4, 94.0, 176000.0), ("pumpkin", 0.78, "low", 15.2, 88.0, 168000.0), ("beans", 0.72, "medium", 9.4, 228.0, 158000.0)],
        },
        "selected": {
            "field-demo-north-paddy": "paddy",
            "field-demo-east-tomato": "tomato",
            "field-demo-south-chili": "onion",
            "field-demo-west-maize": "maize",
        },
    },
    "Yala-2026": {
        "created_at": NOW - timedelta(days=120),
        "field_crops": {
            "field-demo-north-paddy": [("green_gram", 0.88, "low", 1.8, 305.0, 152000.0), ("paddy", 0.79, "medium", 4.3, 138.0, 184000.0), ("maize", 0.76, "low", 4.9, 90.0, 149000.0)],
            "field-demo-east-tomato": [("onion", 0.90, "low", 15.1, 175.0, 256000.0), ("tomato", 0.84, "medium", 22.0, 178.0, 297000.0), ("beans", 0.77, "low", 9.6, 236.0, 188000.0)],
            "field-demo-south-chili": [("chili", 0.87, "medium", 3.2, 710.0, 279000.0), ("pumpkin", 0.79, "low", 15.0, 94.0, 161000.0), ("beans", 0.75, "low", 9.5, 230.0, 181000.0)],
            "field-demo-west-maize": [("pumpkin", 0.84, "low", 15.3, 90.0, 173000.0), ("maize", 0.82, "low", 5.2, 96.0, 171000.0), ("green_gram", 0.74, "low", 1.5, 298.0, 136000.0)],
        },
        "selected": {
            "field-demo-north-paddy": "green_gram",
            "field-demo-east-tomato": "onion",
            "field-demo-south-chili": "chili",
            "field-demo-west-maize": "pumpkin",
        },
    },
    "Maha-2026": {
        "created_at": NOW - timedelta(days=60),
        "field_crops": {
            "field-demo-north-paddy": [("paddy", 0.94, "low", 5.1, 142.0, 236000.0), ("maize", 0.75, "medium", 5.0, 93.0, 160000.0), ("green_gram", 0.70, "low", 1.6, 300.0, 139000.0)],
            "field-demo-east-tomato": [("tomato", 0.92, "medium", 23.4, 188.0, 321000.0), ("onion", 0.84, "low", 15.0, 171.0, 249000.0), ("beans", 0.78, "low", 10.0, 238.0, 193000.0)],
            "field-demo-south-chili": [("beans", 0.85, "low", 10.2, 242.0, 201000.0), ("chili", 0.83, "medium", 3.0, 730.0, 274000.0), ("pumpkin", 0.77, "low", 14.8, 97.0, 166000.0)],
            "field-demo-west-maize": [("maize", 0.88, "low", 5.5, 98.0, 181000.0), ("pumpkin", 0.80, "low", 15.1, 92.0, 170000.0), ("onion", 0.69, "medium", 13.8, 164.0, 214000.0)],
        },
        "selected": {
            "field-demo-north-paddy": "paddy",
            "field-demo-east-tomato": "tomato",
            "field-demo-south-chili": "beans",
            "field-demo-west-maize": "maize",
        },
    },
    "Yala-2027": {
        "created_at": NOW - timedelta(days=10),
        "field_crops": {
            "field-demo-north-paddy": [("green_gram", 0.87, "low", 1.9, 314.0, 158000.0), ("paddy", 0.78, "medium", 4.4, 145.0, 187000.0), ("maize", 0.76, "low", 5.1, 95.0, 155000.0)],
            "field-demo-east-tomato": [("onion", 0.89, "low", 15.2, 177.0, 259000.0), ("tomato", 0.86, "medium", 22.6, 186.0, 305000.0), ("beans", 0.75, "low", 9.7, 239.0, 189000.0)],
            "field-demo-south-chili": [("pumpkin", 0.83, "low", 15.4, 99.0, 172000.0), ("beans", 0.80, "low", 10.1, 241.0, 198000.0), ("chili", 0.78, "medium", 3.1, 735.0, 271000.0)],
            "field-demo-west-maize": [("maize", 0.87, "low", 5.6, 101.0, 184000.0), ("pumpkin", 0.79, "low", 15.0, 94.0, 168000.0), ("green_gram", 0.72, "low", 1.5, 302.0, 138000.0)],
        },
        "selected": {
            "field-demo-north-paddy": "green_gram",
            "field-demo-east-tomato": "onion",
            "field-demo-south-chili": "pumpkin",
            "field-demo-west-maize": "maize",
        },
    },
}


def stable_uuid(name: str) -> str:
    return str(uuid.uuid5(DEMO_NAMESPACE, name))


def load_database_url() -> str:
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url.replace("postgresql+asyncpg://", "postgresql://", 1)

    values = dotenv_values(Path(__file__).with_name(".env"))
    url = values.get("NEON_DATABASE_URL") or values.get("DATABASE_URL")
    if not url:
        raise RuntimeError("No DATABASE_URL or NEON_DATABASE_URL found in environment or .env")
    return str(url)


def table(metadata: MetaData, name: str) -> Table:
    return Table(name, metadata, autoload_with=metadata.bind)


def field_lookup() -> dict[str, dict[str, Any]]:
    return {row["field_id"]: row for row in DEMO_FIELDS}


def build_irrigation_seed_rows(farmer_id: str, officer_id: str, authority_id: str) -> dict[str, list[dict[str, Any]]]:
    fields = []
    pairings = []
    valves = []
    readings = []
    reservoir = []
    requests = []
    request_audit = []
    schedules = []
    policies = []
    policy_audit = []
    observations = []
    topology = [
        {"node_id": "scheme-default-reservoir-main", "scheme_id": "scheme-default", "node_type": "reservoir", "parent_node_id": None, "display_name": "Main Reservoir", "metadata_json": {"seed": True, "capacity_mcm": 268.0}, "created_at": NOW - timedelta(days=30), "updated_at": NOW - timedelta(minutes=15)},
        {"node_id": "scheme-default-canal-main", "scheme_id": "scheme-default", "node_type": "canal", "parent_node_id": "scheme-default-reservoir-main", "display_name": "Main Canal", "metadata_json": {"seed": True, "flow_m3s": 7.4}, "created_at": NOW - timedelta(days=30), "updated_at": NOW - timedelta(minutes=15)},
        {"node_id": "scheme-default-tunnel-main", "scheme_id": "scheme-default", "node_type": "tunnel", "parent_node_id": "scheme-default-canal-main", "display_name": "Main Tunnel", "metadata_json": {"seed": True, "length_km": 1.8}, "created_at": NOW - timedelta(days=30), "updated_at": NOW - timedelta(minutes=15)},
        {"node_id": "scheme-default-channel-main", "scheme_id": "scheme-default", "node_type": "channel", "parent_node_id": "scheme-default-tunnel-main", "display_name": "Main Channel", "metadata_json": {"seed": True, "flow_m3s": 5.1}, "created_at": NOW - timedelta(days=30), "updated_at": NOW - timedelta(minutes=15)},
        {"node_id": "scheme-default-turnout-main-1", "scheme_id": "scheme-default", "node_type": "turnout", "parent_node_id": "scheme-default-channel-main", "display_name": "Turnout 1", "metadata_json": {"seed": True, "fields_served": len(DEMO_FIELDS)}, "created_at": NOW - timedelta(days=30), "updated_at": NOW - timedelta(minutes=15)},
    ]

    for index, spec in enumerate(DEMO_FIELDS, start=1):
        fields.append(
            {
                "field_id": spec["field_id"],
                "field_name": spec["field_name"],
                "crop_type": spec["crop_type"],
                "soil_type": spec["soil_type"],
                "area_hectares": spec["area_hectares"],
                "device_id": spec["device_id"],
                "owner_id": farmer_id,
                "scheme_id": spec["scheme_id"],
                "latitude": spec["latitude"],
                "longitude": spec["longitude"],
                "location_name": spec["location_name"],
                "lifecycle_state": "DEGRADED" if spec["stale"] else "LIVE",
                "pairing_status": "PAIRED",
                "last_handshake_at": NOW - (timedelta(minutes=45) if spec["stale"] else timedelta(minutes=2)),
                "live_since": NOW - timedelta(days=75 - (index * 3)),
                "suspended_reason": "Telemetry lag under observation" if spec["stale"] else None,
                "water_level_min_pct": spec["water_level_min_pct"],
                "water_level_max_pct": spec["water_level_max_pct"],
                "water_level_optimal_pct": spec["water_level_optimal_pct"],
                "water_level_critical_pct": spec["water_level_critical_pct"],
                "soil_moisture_min_pct": spec["soil_moisture_min_pct"],
                "soil_moisture_max_pct": spec["soil_moisture_max_pct"],
                "soil_moisture_optimal_pct": spec["soil_moisture_optimal_pct"],
                "soil_moisture_critical_pct": spec["soil_moisture_critical_pct"],
                "irrigation_duration_minutes": spec["irrigation_duration_minutes"],
                "auto_control_enabled": not spec["stale"],
                "created_at": NOW - timedelta(days=90 - (index * 4)),
                "updated_at": NOW - timedelta(minutes=4 if not spec["stale"] else 40),
            }
        )
        pairings.append(
            {
                "pairing_id": stable_uuid(f"pairing:{spec['field_id']}"),
                "field_id": spec["field_id"],
                "device_id": spec["device_id"],
                "status": "ACTIVE",
                "challenge_code": f"{1200 + index}",
                "initiated_by": officer_id,
                "confirmed_by": authority_id,
                "created_at": NOW - timedelta(days=70 - (index * 2)),
                "expires_at": NOW + timedelta(days=365),
                "first_telemetry_at": NOW - timedelta(days=69 - (index * 2)),
                "confirmed_at": NOW - timedelta(days=69 - (index * 2)),
                "updated_at": NOW - timedelta(minutes=5),
            }
        )
        valve_status = "OPEN" if spec["latest_moisture"] < spec["soil_moisture_optimal_pct"] else "CLOSED"
        valves.append(
            {
                "field_id": spec["field_id"],
                "status": valve_status,
                "position_pct": 68 if valve_status == "OPEN" else 0,
                "last_action": "OPEN" if valve_status == "OPEN" else "CLOSE",
                "last_action_time": NOW - timedelta(minutes=12 + index),
                "updated_at": NOW - timedelta(minutes=3 if not spec["stale"] else 38),
            }
        )

        total_points = 36
        for step in range(total_points):
            hours_ago = (total_points - step) * 4
            timestamp = NOW - timedelta(hours=hours_ago)
            seasonal_wave = math.sin(step / 4.0) * 5.5
            moisture = max(12.0, min(84.0, spec["latest_moisture"] + seasonal_wave - (0.35 * (total_points - step))))
            water_level = max(6.0, min(92.0, spec["latest_water_level"] + math.cos(step / 5.0) * 4.0 - (0.18 * (total_points - step))))
            readings.append(
                {
                    "reading_id": stable_uuid(f"reading:{spec['field_id']}:{step}"),
                    "field_id": spec["field_id"],
                    "device_id": spec["device_id"],
                    "timestamp": timestamp,
                    "soil_moisture_pct": round(moisture, 2),
                    "water_level_pct": round(water_level, 2),
                    "soil_ao": int(520 + (step * 7) + (index * 11)),
                    "water_ao": int(460 + (step * 5) + (index * 9)),
                    "rssi": -61 - (index * 2) - (step % 4),
                    "battery_v": round(3.82 - (step * 0.008), 2),
                    "created_at": timestamp,
                }
            )

        latest_timestamp = NOW - (timedelta(minutes=2 + index) if not spec["stale"] else timedelta(minutes=43))
        readings.append(
            {
                "reading_id": stable_uuid(f"reading:{spec['field_id']}:latest"),
                "field_id": spec["field_id"],
                "device_id": spec["device_id"],
                "timestamp": latest_timestamp,
                "soil_moisture_pct": spec["latest_moisture"],
                "water_level_pct": spec["latest_water_level"],
                "soil_ao": 640 + (index * 13),
                "water_ao": 535 + (index * 10),
                "rssi": -58 - index,
                "battery_v": 3.71 - (index * 0.02),
                "created_at": latest_timestamp,
            }
        )

    for day in range(10):
        snap_ts = NOW - timedelta(days=(9 - day), hours=6)
        reservoir.append(
            {
                "snapshot_id": stable_uuid(f"reservoir:{day}"),
                "timestamp": snap_ts,
                "water_level_mmsl": round(112.5 + day * 0.22, 2),
                "total_storage_mcm": round(154.0 + day * 1.9, 2),
                "active_storage_mcm": round(112.0 + day * 1.5, 2),
                "inflow_mcm": round(4.2 + (day * 0.3), 2),
                "rain_mm": round(max(0.0, 9.0 - day * 0.5), 2),
                "main_canals_mcm": round(5.6 + (day * 0.15), 2),
                "lb_main_canal_mcm": round(2.7 + (day * 0.08), 2),
                "rb_main_canal_mcm": round(2.4 + (day * 0.07), 2),
                "evap_mm": round(3.1 + (day * 0.06), 2),
                "spillway_mcm": None,
                "wind_speed_ms": round(1.8 + (day * 0.12), 2),
                "observed_at": snap_ts,
            }
        )

    policy_id = stable_uuid("policy:scheme-default:active")
    policies.append(
        {
            "policy_id": policy_id,
            "scheme_id": "scheme-default",
            "version": 3,
            "status": "PUBLISHED",
            "quota_mcm": 24.5,
            "max_field_open_pct": 75,
            "emergency_mode": None,
            "constraints": {
                "night_irrigation": True,
                "max_concurrent_turnouts": 2,
                "priority_crop": "paddy",
                "manual_review_threshold_pct": 20,
            },
            "created_by": authority_id,
            "published_by": authority_id,
            "published_at": NOW - timedelta(days=8),
            "created_at": NOW - timedelta(days=10),
            "updated_at": NOW - timedelta(hours=3),
        }
    )
    policy_audit.extend(
        [
            {
                "audit_id": stable_uuid("policy-audit:create"),
                "policy_id": policy_id,
                "scheme_id": "scheme-default",
                "version": 3,
                "event_type": "CREATED",
                "actor_id": authority_id,
                "actor_roles": ["authority"],
                "created_at": NOW - timedelta(days=10),
            },
            {
                "audit_id": stable_uuid("policy-audit:publish"),
                "policy_id": policy_id,
                "scheme_id": "scheme-default",
                "version": 3,
                "event_type": "PUBLISHED",
                "actor_id": authority_id,
                "actor_roles": ["authority"],
                "created_at": NOW - timedelta(days=8),
            },
        ]
    )
    schedules.extend(
        [
            {
                "schedule_id": stable_uuid("schedule:open-main-1"),
                "scheme_id": "scheme-default",
                "canal_id": "scheme-default-canal-main",
                "tunnel_id": "scheme-default-tunnel-main",
                "channel_id": "scheme-default-channel-main",
                "turnout_id": "scheme-default-turnout-main-1",
                "action": "OPEN",
                "expected_flow_m3s": 2.8,
                "start_time": NOW + timedelta(hours=2),
                "end_time": NOW + timedelta(hours=5),
                "requested_by": officer_id,
                "requested_roles": ["officer"],
                "policy_id": policy_id,
                "policy_version": 3,
                "status": "ACCEPTED",
                "reason": "Morning release for paddy and tomato blocks",
                "conflict_reason": None,
                "created_at": NOW - timedelta(hours=4),
            },
            {
                "schedule_id": stable_uuid("schedule:close-main-2"),
                "scheme_id": "scheme-default",
                "canal_id": "scheme-default-canal-main",
                "tunnel_id": "scheme-default-tunnel-main",
                "channel_id": "scheme-default-channel-main",
                "turnout_id": "scheme-default-turnout-main-1",
                "action": "CLOSE",
                "expected_flow_m3s": 0.0,
                "start_time": NOW + timedelta(hours=6),
                "end_time": NOW + timedelta(hours=7),
                "requested_by": officer_id,
                "requested_roles": ["officer"],
                "policy_id": policy_id,
                "policy_version": 3,
                "status": "ACCEPTED",
                "reason": "Shutoff before rainfall window",
                "conflict_reason": None,
                "created_at": NOW - timedelta(hours=2),
            },
            {
                "schedule_id": stable_uuid("schedule:rejected-night"),
                "scheme_id": "scheme-default",
                "canal_id": "scheme-default-canal-main",
                "tunnel_id": "scheme-default-tunnel-main",
                "channel_id": "scheme-default-channel-main",
                "turnout_id": "scheme-default-turnout-main-1",
                "action": "OPEN",
                "expected_flow_m3s": 3.4,
                "start_time": NOW - timedelta(hours=6),
                "end_time": NOW - timedelta(hours=4),
                "requested_by": officer_id,
                "requested_roles": ["officer"],
                "policy_id": policy_id,
                "policy_version": 3,
                "status": "REJECTED",
                "reason": "Night release request",
                "conflict_reason": "Exceeded concurrent turnout limit",
                "created_at": NOW - timedelta(hours=10),
            },
        ]
    )
    requests.extend(
        [
            {
                "request_id": stable_uuid("manual-request:pending"),
                "field_id": "field-demo-south-chili",
                "requested_action": "OPEN",
                "requested_position_pct": 75,
                "reason": "Soil moisture dropped below safe threshold before noon cycle",
                "source_decision": {"model": "f1-rule-engine", "reason": "dry_zone", "confidence": 0.83},
                "status": "PENDING",
                "created_by": farmer_id,
                "reviewed_by": None,
                "closed_by": None,
                "review_note": None,
                "reviewed_at": None,
                "executed_at": None,
                "closed_at": None,
                "execution_note": None,
                "created_at": NOW - timedelta(minutes=28),
                "updated_at": NOW - timedelta(minutes=28),
            },
            {
                "request_id": stable_uuid("manual-request:approved"),
                "field_id": "field-demo-west-maize",
                "requested_action": "CLOSE",
                "requested_position_pct": 0,
                "reason": "Heavy overnight rain expected from forecast service",
                "source_decision": {"model": "f3-weather-link", "reason": "rain_event", "confidence": 0.78},
                "status": "EXECUTED",
                "created_by": officer_id,
                "reviewed_by": authority_id,
                "closed_by": authority_id,
                "review_note": "Approved based on reservoir margin and forecast confidence",
                "reviewed_at": NOW - timedelta(hours=3),
                "executed_at": NOW - timedelta(hours=2, minutes=35),
                "closed_at": NOW - timedelta(hours=2, minutes=30),
                "execution_note": "Valve closed remotely via officer console",
                "created_at": NOW - timedelta(hours=4),
                "updated_at": NOW - timedelta(hours=2, minutes=30),
            },
        ]
    )
    request_audit.extend(
        [
            {
                "audit_id": stable_uuid("manual-audit:pending:create"),
                "request_id": stable_uuid("manual-request:pending"),
                "event_type": "CREATED",
                "actor_id": farmer_id,
                "actor_roles": ["farmer"],
                "detail": {"requested_action": "OPEN", "requested_position_pct": 75},
                "created_at": NOW - timedelta(minutes=28),
            },
            {
                "audit_id": stable_uuid("manual-audit:approved:create"),
                "request_id": stable_uuid("manual-request:approved"),
                "event_type": "CREATED",
                "actor_id": officer_id,
                "actor_roles": ["officer"],
                "detail": {"requested_action": "CLOSE"},
                "created_at": NOW - timedelta(hours=4),
            },
            {
                "audit_id": stable_uuid("manual-audit:approved:review"),
                "request_id": stable_uuid("manual-request:approved"),
                "event_type": "REVIEWED",
                "actor_id": authority_id,
                "actor_roles": ["authority"],
                "detail": {"status": "APPROVED"},
                "created_at": NOW - timedelta(hours=3),
            },
            {
                "audit_id": stable_uuid("manual-audit:approved:closed"),
                "request_id": stable_uuid("manual-request:approved"),
                "event_type": "CLOSED",
                "actor_id": authority_id,
                "actor_roles": ["authority"],
                "detail": {"status": "EXECUTED"},
                "created_at": NOW - timedelta(hours=2, minutes=30),
            },
        ]
    )
    observations.extend(
        [
            {
                "observation_id": stable_uuid("observation:1"),
                "field_id": "field-demo-south-chili",
                "latitude": 6.4179,
                "longitude": 80.9021,
                "kind": "water_stress",
                "severity": "high",
                "title": "Leaf curl near south edge",
                "note": "Farmer noted midday wilting on the exposed ridge section.",
                "photo_url": None,
                "prediction_label": "water_stress",
                "prediction_confidence": 0.87,
                "created_by": farmer_id,
                "created_at": NOW - timedelta(days=1, hours=2),
                "updated_at": NOW - timedelta(days=1, hours=2),
            },
            {
                "observation_id": stable_uuid("observation:2"),
                "field_id": "field-demo-east-tomato",
                "latitude": 6.4252,
                "longitude": 80.8965,
                "kind": "disease",
                "severity": "medium",
                "title": "Early blight patch monitored",
                "note": "Localized lesion cluster stayed stable after treatment.",
                "photo_url": None,
                "prediction_label": "early_blight",
                "prediction_confidence": 0.74,
                "created_by": farmer_id,
                "created_at": NOW - timedelta(days=2, hours=5),
                "updated_at": NOW - timedelta(days=2, hours=5),
            },
        ]
    )

    water_management_state = [
        {
            "id": 1,
            "manual_override_active": False,
            "manual_override_action": None,
            "manual_valve_position": None,
            "last_prediction": {
                "recommended_action": "OPEN",
                "target_fields": ["field-demo-south-chili"],
                "confidence": 0.83,
            },
            "last_decision": {
                "executed_action": "MIXED",
                "operator_note": "West maize closed, chili queued for review",
                "updated_at": NOW.isoformat(),
            },
            "updated_at": NOW - timedelta(minutes=5),
        }
    ]

    return {
        "irrigation_crop_fields": fields,
        "irrigation_device_pairings": pairings,
        "irrigation_valve_states": valves,
        "irrigation_sensor_readings": readings,
        "irrigation_reservoir_snapshots": reservoir,
        "irrigation_manual_requests": requests,
        "irrigation_manual_request_audit": request_audit,
        "irrigation_hydraulic_schedules": schedules,
        "irrigation_authority_policies": policies,
        "irrigation_authority_policy_audit": policy_audit,
        "irrigation_field_observations": observations,
        "irrigation_hydraulic_topology_nodes": topology,
        "irrigation_water_management_state": water_management_state,
    }


def build_optimize_seed_rows() -> dict[str, list[dict[str, Any]]]:
    fields = []
    crops = []
    historical_yields = []
    price_records = []
    recommendations = []
    artifacts = []
    outcomes = []
    monitoring_runs = []
    plan_b_events = []
    calendars = []
    alerts = []

    crop_index = {crop["id"]: crop for crop in DEMO_CROPS}

    for spec in DEMO_FIELDS:
        fields.append(
            {
                "id": spec["field_id"],
                "name": spec["field_name"],
                "scheme_id": spec["scheme_id"],
                "area_ha": spec["area_hectares"],
                "soil_type": spec["soil_type"],
                "soil_ph": spec["soil_ph"],
                "soil_ec": spec["soil_ec"],
                "location": spec["location_name"],
                "latitude": spec["latitude"],
                "longitude": spec["longitude"],
                "elevation_m": spec["elevation_m"],
                "soil_suitability": spec["soil_suitability"],
                "water_availability_mm": spec["water_availability_mm"],
                "created_at": NOW - timedelta(days=120),
                "updated_at": NOW - timedelta(days=1),
            }
        )

    for crop in DEMO_CROPS:
        crops.append(
            {
                "id": crop["id"],
                "name": crop["name"],
                "category": crop["category"],
                "kc_curve_ref": None,
                "growth_duration_days": crop["growth_duration_days"],
                "ph_min": crop["ph_min"],
                "ph_max": crop["ph_max"],
                "ec_max": crop["ec_max"],
                "water_sensitivity": crop["water_sensitivity"],
                "base_yield_t_per_ha": crop["base_yield_t_per_ha"],
                "water_requirement_mm": crop["water_requirement_mm"],
                "created_at": NOW - timedelta(days=180),
            }
        )

    history_id = 9001
    for year, season in [(2024, "Maha-2024"), (2025, "Yala-2025"), (2025, "Maha-2025")]:
        for spec in DEMO_FIELDS:
            crop_id = {
                "field-demo-north-paddy": "paddy" if "Maha" in season else "green_gram",
                "field-demo-east-tomato": "tomato" if "Maha" in season else "onion",
                "field-demo-south-chili": "chili" if season != "Yala-2025" else "beans",
                "field-demo-west-maize": "maize" if season != "Yala-2025" else "pumpkin",
            }[spec["field_id"]]
            base = crop_index[crop_id]["base_yield_t_per_ha"]
            water_used = spec["water_availability_mm"] * (0.86 if "Yala" in season else 0.93)
            historical_yields.append(
                {
                    "id": history_id,
                    "field_id": spec["field_id"],
                    "crop_id": crop_id,
                    "season": season,
                    "year": year,
                    "yield_t_per_ha": round(base * (0.92 + (history_id % 4) * 0.04), 2),
                    "water_used_mm": round(water_used, 2),
                    "notes": f"{DEMO_SOURCE} historical benchmark",
                    "is_synthetic": True,
                    "source_tag": DEMO_SOURCE,
                    "recorded_at": NOW - timedelta(days=400 - (history_id - 9001)),
                }
            )
            history_id += 1

    price_id = 9401
    for month_offset in range(0, 10):
        price_date = (NOW.date().replace(day=1) - timedelta(days=month_offset * 30))
        for crop in ["paddy", "tomato", "chili", "maize", "onion", "green_gram"]:
            seasonal_bump = {"paddy": 132, "tomato": 184, "chili": 725, "maize": 97, "onion": 172, "green_gram": 305}[crop]
            delta = (month_offset % 4) * 4 - month_offset
            price_records.append(
                {
                    "id": price_id,
                    "crop_id": crop,
                    "date": price_date,
                    "price_per_kg": round(seasonal_bump + delta, 2),
                    "market_name": "Dambulla Dedicated Economic Centre",
                    "price_type": "farmgate",
                    "source": DEMO_SOURCE,
                    "is_synthetic": True,
                    "source_tag": DEMO_SOURCE,
                    "recorded_at": datetime.combine(price_date, datetime.min.time(), tzinfo=timezone.utc),
                }
            )
            price_id += 1

    recommendation_id = 9701
    for season, spec in SEASON_SPECS.items():
        for field_id, recs in spec["field_crops"].items():
            response_rows = []
            for rank, (crop_id, suitability, risk_band, yield_t_ha, price_per_kg, profit_per_ha) in enumerate(recs, start=1):
                response_rows.append(
                    {
                        "rank": rank,
                        "crop_id": crop_id,
                        "crop_name": crop_index[crop_id]["name"],
                        "suitability_score": suitability,
                        "risk_band": risk_band,
                        "expected_yield_t_per_ha": yield_t_ha,
                        "predicted_yield_t_ha": yield_t_ha,
                        "predicted_price_per_kg": price_per_kg,
                        "expected_profit_per_ha": profit_per_ha,
                        "water_requirement_mm": crop_index[crop_id]["water_requirement_mm"],
                        "confidence": round(0.78 + (0.03 * (4 - rank)), 2),
                    }
                )

            recommendations.append(
                {
                    "id": recommendation_id,
                    "field_id": field_id,
                    "season": season,
                    "request_data": {
                        "field_id": field_id,
                        "season": season,
                        "seed_tag": DEMO_SOURCE,
                    },
                    "response_data": {
                        "status": "ok",
                        "data_available": True,
                        "message": "Demo recommendation set ready for dashboard presentation.",
                        "seed_tag": DEMO_SOURCE,
                        "recommendations": response_rows,
                    },
                    "selected_crop_id": spec["selected"][field_id],
                    "created_at": spec["created_at"],
                }
            )
            recommendation_id += 1

    artifacts.extend(
        [
            {
                "id": 9801,
                "run_type": "operator_plan",
                "field_id": None,
                "season": "Maha-2025",
                "request_payload": {
                    "season": "Maha-2025",
                    "scheme_id": "scheme-default",
                    "water_quota_mm": 2610.0,
                    "priority": "profit",
                    "seed_tag": DEMO_SOURCE,
                },
                "response_payload": {
                    "data": {
                        "status": "ok",
                        "scenario_name": "Baseline Maha 2025",
                        "total_profit": 2486000.0,
                        "total_area": 10.1,
                        "water_usage": 2578.0,
                        "summary": {
                            "total_profit": 2486000.0,
                            "total_area": 10.1,
                            "water_usage": 2578.0,
                        },
                        "allocation": [
                            {"crop_id": "paddy", "crop_name": "Paddy", "area_ha": 3.4, "profit": 775200.0, "water_usage": 3740.0},
                            {"crop_id": "tomato", "crop_name": "Tomato", "area_ha": 1.8, "profit": 561600.0, "water_usage": 828.0},
                            {"crop_id": "onion", "crop_name": "Onion", "area_ha": 2.2, "profit": 508200.0, "water_usage": 902.0},
                            {"crop_id": "maize", "crop_name": "Maize", "area_ha": 2.7, "profit": 475200.0, "water_usage": 1350.0},
                        ],
                    },
                    "status": "ok",
                    "source": DEMO_SOURCE,
                    "data_available": True,
                    "observed_at": (NOW - timedelta(days=5)).isoformat(),
                },
                "status": "ok",
                "source": DEMO_SOURCE,
                "data_available": True,
                "observed_at": NOW - timedelta(days=5),
                "created_at": NOW - timedelta(days=5),
            },
            {
                "id": 9802,
                "run_type": "operator_scenario",
                "field_id": None,
                "season": "Maha-2025",
                "request_payload": {
                    "season": "Maha-2025",
                    "scenario_name": "Reduced water quota",
                    "water_quota_mm": 2200.0,
                    "seed_tag": DEMO_SOURCE,
                },
                "response_payload": {
                    "data": {
                        "status": "ok",
                        "scenario_name": "Reduced water quota",
                        "total_profit": 2314000.0,
                        "total_area": 9.6,
                        "water_usage": 2190.0,
                        "allocation": [
                            {"crop_id": "green_gram", "crop_name": "Green gram", "area_ha": 1.7, "profit": 239700.0, "water_usage": 612.0},
                            {"crop_id": "onion", "crop_name": "Onion", "area_ha": 4.0, "profit": 975000.0, "water_usage": 1640.0},
                            {"crop_id": "maize", "crop_name": "Maize", "area_ha": 3.9, "profit": 699300.0, "water_usage": 1950.0},
                        ],
                    },
                    "status": "ok",
                    "source": DEMO_SOURCE,
                    "data_available": True,
                    "observed_at": (NOW - timedelta(days=3)).isoformat(),
                },
                "status": "ok",
                "source": DEMO_SOURCE,
                "data_available": True,
                "observed_at": NOW - timedelta(days=3),
                "created_at": NOW - timedelta(days=3),
            },
        ]
    )

    outcomes.extend(
        [
            {
                "id": 9901,
                "field_id": "field-demo-north-paddy",
                "crop_id": "paddy",
                "actual_crop_id": "paddy",
                "season": "Maha-2025",
                "year": 2025,
                "actual_yield_t_ha": 4.8,
                "actual_sale_price_kg": 136.0,
                "actual_water_used_mm": 1015.0,
                "recommendation_id": 9701,
                "feedback_date": date(2025, 12, 15),
                "notes": "Close to predicted output after steady canal supply.",
                "submitted_by": "demo-farmer",
                "created_at": NOW - timedelta(days=40),
            },
            {
                "id": 9902,
                "field_id": "field-demo-east-tomato",
                "crop_id": "tomato",
                "actual_crop_id": "tomato",
                "season": "Maha-2025",
                "year": 2025,
                "actual_yield_t_ha": 22.7,
                "actual_sale_price_kg": 186.0,
                "actual_water_used_mm": 448.0,
                "recommendation_id": 9702,
                "feedback_date": date(2025, 12, 17),
                "notes": "Yield reduced slightly by a short blight episode.",
                "submitted_by": "demo-farmer",
                "created_at": NOW - timedelta(days=38),
            },
        ]
    )

    monitoring_runs.extend(
        [
            {"id": 9951, "run_date": date(2025, 11, 1), "scheme_id": "scheme-default", "crop_id": None, "model_name": "yield_model", "sample_count": 48, "mae": 0.41, "rmse": 0.58, "r2_score": 0.81, "drift_detected": False, "drift_features": ["soil_moisture_pct"], "report_payload": {"window": "rolling_90d", "seed_tag": DEMO_SOURCE}, "created_at": NOW - timedelta(days=28)},
            {"id": 9952, "run_date": date(2025, 12, 1), "scheme_id": "scheme-default", "crop_id": None, "model_name": "price_model", "sample_count": 64, "mae": 8.2, "rmse": 11.5, "r2_score": 0.74, "drift_detected": True, "drift_features": ["market_price"], "report_payload": {"window": "rolling_90d", "seed_tag": DEMO_SOURCE}, "created_at": NOW - timedelta(days=21)},
            {"id": 9953, "run_date": date(2026, 1, 1), "scheme_id": "scheme-default", "crop_id": None, "model_name": "recommendation_ranker", "sample_count": 52, "mae": 0.0, "rmse": 0.0, "r2_score": 0.89, "drift_detected": False, "drift_features": [], "report_payload": {"precision_at_1": 0.82, "seed_tag": DEMO_SOURCE}, "created_at": NOW - timedelta(days=12)},
        ]
    )

    plan_b_events.extend(
        [
            {
                "id": 9971,
                "field_id": "field-demo-south-chili",
                "season": "Maha-2025",
                "trigger_type": "soil_moisture_drop",
                "trigger_value": 29.0,
                "threshold_value": 32.0,
                "previous_crop_id": "chili",
                "new_crop_id": "onion",
                "plan_b_recommendation_id": 9703,
                "notified": True,
                "created_at": NOW - timedelta(days=14),
            },
            {
                "id": 9972,
                "field_id": "field-demo-west-maize",
                "season": "Yala-2026",
                "trigger_type": "price_shock",
                "trigger_value": -12.0,
                "threshold_value": -8.0,
                "previous_crop_id": "maize",
                "new_crop_id": "pumpkin",
                "plan_b_recommendation_id": 9708,
                "notified": False,
                "created_at": NOW - timedelta(days=9),
            },
        ]
    )

    calendars.extend(
        [
            {
                "id": 9981,
                "recommendation_id": 9709,
                "field_id": "field-demo-north-paddy",
                "crop_id": "paddy",
                "season": "Maha-2026",
                "planting_window_start": date(2026, 9, 20),
                "planting_window_end": date(2026, 10, 2),
                "irrigation_windows": [{"week": 1, "action": "flood-establish"}, {"week": 5, "action": "alternate-wet-dry"}],
                "fertilizer_windows": [{"week": 2, "type": "basal"}, {"week": 7, "type": "top-dress"}],
                "harvest_window_start": date(2027, 1, 18),
                "harvest_window_end": date(2027, 1, 28),
                "expected_market_week": "2027-W04",
                "created_at": NOW - timedelta(days=7),
            },
            {
                "id": 9982,
                "recommendation_id": 9710,
                "field_id": "field-demo-east-tomato",
                "crop_id": "tomato",
                "season": "Maha-2026",
                "planting_window_start": date(2026, 9, 25),
                "planting_window_end": date(2026, 10, 4),
                "irrigation_windows": [{"week": 1, "action": "starter-drip"}, {"week": 4, "action": "fruit-set"}],
                "fertilizer_windows": [{"week": 2, "type": "nitrogen"}, {"week": 6, "type": "potassium"}],
                "harvest_window_start": date(2026, 12, 28),
                "harvest_window_end": date(2027, 1, 20),
                "expected_market_week": "2027-W03",
                "created_at": NOW - timedelta(days=7),
            },
        ]
    )

    alerts.extend(
        [
            {
                "id": 9991,
                "scheme_id": "scheme-default",
                "season": "Maha-2025",
                "crop_id": "paddy",
                "crop_name": "Paddy",
                "area_allocated_ha": 4.1,
                "pct_of_scheme": 40.6,
                "alert_threshold_pct": 35.0,
                "price_trend_pct": -6.4,
                "severity": "warning",
                "resolved": False,
                "created_at": NOW - timedelta(days=6),
            },
            {
                "id": 9992,
                "scheme_id": "scheme-default",
                "season": "Maha-2025",
                "crop_id": "onion",
                "crop_name": "Onion",
                "area_allocated_ha": 2.2,
                "pct_of_scheme": 21.8,
                "alert_threshold_pct": 20.0,
                "price_trend_pct": 3.2,
                "severity": "critical",
                "resolved": False,
                "created_at": NOW - timedelta(days=4),
            },
        ]
    )

    return {
        "fields": fields,
        "crops": crops,
        "historical_yields": historical_yields,
        "price_records": price_records,
        "recommendations": recommendations,
        "optimization_run_artifacts": artifacts,
        "crop_outcomes": outcomes,
        "model_monitoring_runs": monitoring_runs,
        "plan_b_trigger_events": plan_b_events,
        "crop_calendars": calendars,
        "scheme_oversupply_alerts": alerts,
    }


def delete_existing_demo_rows(conn, tables: dict[str, Table]) -> None:
    field_ids = [row["field_id"] for row in DEMO_FIELDS]
    crop_ids = [row["id"] for row in DEMO_CROPS]
    recommendation_ids = list(range(9701, 9717))
    artifact_ids = [9801, 9802]
    manual_request_ids = [stable_uuid("manual-request:pending"), stable_uuid("manual-request:approved")]
    policy_ids = [stable_uuid("policy:scheme-default:active")]
    schedule_ids = [
        stable_uuid("schedule:open-main-1"),
        stable_uuid("schedule:close-main-2"),
        stable_uuid("schedule:rejected-night"),
    ]

    conn.execute(tables["irrigation_manual_request_audit"].delete().where(tables["irrigation_manual_request_audit"].c.request_id.in_(manual_request_ids)))
    conn.execute(tables["irrigation_manual_requests"].delete().where(tables["irrigation_manual_requests"].c.request_id.in_(manual_request_ids)))
    conn.execute(tables["irrigation_field_observations"].delete().where(tables["irrigation_field_observations"].c.field_id.in_(field_ids)))
    conn.execute(tables["irrigation_sensor_readings"].delete().where(tables["irrigation_sensor_readings"].c.field_id.in_(field_ids)))
    conn.execute(tables["irrigation_valve_states"].delete().where(tables["irrigation_valve_states"].c.field_id.in_(field_ids)))
    conn.execute(tables["irrigation_device_pairings"].delete().where(tables["irrigation_device_pairings"].c.field_id.in_(field_ids)))
    conn.execute(tables["irrigation_hydraulic_schedules"].delete().where(tables["irrigation_hydraulic_schedules"].c.schedule_id.in_(schedule_ids)))
    conn.execute(tables["irrigation_authority_policy_audit"].delete().where(tables["irrigation_authority_policy_audit"].c.policy_id.in_(policy_ids)))
    conn.execute(tables["irrigation_authority_policies"].delete().where(tables["irrigation_authority_policies"].c.policy_id.in_(policy_ids)))
    conn.execute(tables["irrigation_hydraulic_topology_nodes"].delete().where(tables["irrigation_hydraulic_topology_nodes"].c.scheme_id == "scheme-default"))
    conn.execute(tables["irrigation_reservoir_snapshots"].delete().where(tables["irrigation_reservoir_snapshots"].c.snapshot_id.in_([stable_uuid(f"reservoir:{idx}") for idx in range(10)])))
    conn.execute(tables["irrigation_crop_fields"].delete().where(tables["irrigation_crop_fields"].c.field_id.in_(field_ids)))
    conn.execute(tables["irrigation_water_management_state"].delete().where(tables["irrigation_water_management_state"].c.id == 1))

    conn.execute(tables["crop_calendars"].delete().where(tables["crop_calendars"].c.id.in_([9981, 9982])))
    conn.execute(tables["plan_b_trigger_events"].delete().where(tables["plan_b_trigger_events"].c.id.in_([9971, 9972])))
    conn.execute(tables["crop_outcomes"].delete().where(tables["crop_outcomes"].c.id.in_([9901, 9902])))
    conn.execute(tables["recommendations"].delete().where(tables["recommendations"].c.id.in_(recommendation_ids)))
    conn.execute(tables["model_monitoring_runs"].delete().where(tables["model_monitoring_runs"].c.id.in_([9951, 9952, 9953])))
    conn.execute(tables["historical_yields"].delete().where(tables["historical_yields"].c.field_id.in_(field_ids)))
    conn.execute(tables["price_records"].delete().where(tables["price_records"].c.source_tag == DEMO_SOURCE))
    conn.execute(tables["optimization_run_artifacts"].delete().where(tables["optimization_run_artifacts"].c.id.in_(artifact_ids)))
    conn.execute(tables["scheme_oversupply_alerts"].delete().where(tables["scheme_oversupply_alerts"].c.id.in_([9991, 9992])))
    conn.execute(tables["fields"].delete().where(tables["fields"].c.id.in_(field_ids)))
    conn.execute(tables["crops"].delete().where(tables["crops"].c.id.in_(crop_ids)))


def fetch_demo_users(conn, users_table: Table) -> dict[str, str]:
    rows = conn.execute(
        select(users_table.c.id, users_table.c.username).where(
            users_table.c.username.in_(["farmer", "officer", "authority"])
        )
    ).all()
    users = {str(row.username): str(row.id) for row in rows}
    missing = sorted({"farmer", "officer", "authority"} - set(users))
    if missing:
        raise RuntimeError(
            "Missing auth demo users: "
            + ", ".join(missing)
            + ". Run services/auth_service/seed_admin.py first."
        )
    return users


def insert_rows(conn, tables: dict[str, Table], payload: dict[str, list[dict[str, Any]]]) -> None:
    for table_name, rows in payload.items():
        if not rows:
            continue
        conn.execute(tables[table_name].insert(), rows)


def summarise_counts(conn, tables: dict[str, Table]) -> dict[str, int]:
    names = [
        "irrigation_crop_fields",
        "irrigation_sensor_readings",
        "irrigation_manual_requests",
        "irrigation_hydraulic_schedules",
        "fields",
        "crops",
        "historical_yields",
        "price_records",
        "recommendations",
        "optimization_run_artifacts",
        "scheme_oversupply_alerts",
    ]
    return {
        name: int(conn.execute(select(func.count()).select_from(tables[name])).scalar_one())
        for name in names
    }


def main() -> None:
    url = load_database_url()
    print(f"Seeding demo data into {url.split('@')[-1]}")
    engine = create_engine(url, future=True)
    metadata = MetaData()
    metadata.bind = engine

    tables = {
        name: table(metadata, name)
        for name in [
            "users",
            "irrigation_crop_fields",
            "irrigation_device_pairings",
            "irrigation_valve_states",
            "irrigation_sensor_readings",
            "irrigation_reservoir_snapshots",
            "irrigation_manual_requests",
            "irrigation_manual_request_audit",
            "irrigation_hydraulic_schedules",
            "irrigation_authority_policies",
            "irrigation_authority_policy_audit",
            "irrigation_field_observations",
            "irrigation_hydraulic_topology_nodes",
            "irrigation_water_management_state",
            "fields",
            "crops",
            "historical_yields",
            "price_records",
            "recommendations",
            "optimization_run_artifacts",
            "crop_outcomes",
            "model_monitoring_runs",
            "plan_b_trigger_events",
            "crop_calendars",
            "scheme_oversupply_alerts",
        ]
    }

    with engine.begin() as conn:
        users = fetch_demo_users(conn, tables["users"])
        delete_existing_demo_rows(conn, tables)

        irrigation_payload = build_irrigation_seed_rows(
            farmer_id=users["farmer"],
            officer_id=users["officer"],
            authority_id=users["authority"],
        )
        optimize_payload = build_optimize_seed_rows()

        insert_rows(conn, tables, irrigation_payload)
        insert_rows(conn, tables, optimize_payload)

        counts = summarise_counts(conn, tables)

    print("Demo seed completed.")
    for key, value in counts.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    main()

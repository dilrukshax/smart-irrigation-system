"""One-time bootstrap to seed F4 reference data from CSV into PostgreSQL."""

from __future__ import annotations

import csv
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.data.db import SessionLocal
from app.data.models_orm import Crop, Field


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
FIELDS_CSV = DATA_DIR / "fields.csv"
CROPS_CSV = DATA_DIR / "crops.csv"


def _to_float(value: str | None) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _to_int(value: str | None) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except ValueError:
        return None


def seed_fields(session: Session) -> int:
    if not FIELDS_CSV.exists():
        return 0

    inserted = 0
    with FIELDS_CSV.open("r", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            field_id = str(row.get("field_id") or "").strip()
            if not field_id:
                continue
            model = session.query(Field).filter(Field.id == field_id).first()
            if model is None:
                model = Field(id=field_id, name=row.get("field_name") or field_id, scheme_id=row.get("scheme_id") or "UNKNOWN", area_ha=1.0)
                session.add(model)
                inserted += 1

            model.name = row.get("field_name") or model.name
            model.scheme_id = row.get("scheme_id") or model.scheme_id
            model.area_ha = _to_float(row.get("area_ha")) or model.area_ha
            model.soil_type = row.get("soil_type") or model.soil_type
            model.soil_ph = _to_float(row.get("soil_ph"))
            model.soil_ec = _to_float(row.get("soil_ec"))
            model.location = row.get("location") or model.location
            model.latitude = _to_float(row.get("latitude"))
            model.longitude = _to_float(row.get("longitude"))
            model.elevation_m = _to_float(row.get("elevation"))
            model.soil_suitability = _to_float(row.get("soil_suitability"))
            model.water_availability_mm = _to_float(row.get("water_availability_mm"))

    return inserted


def seed_crops(session: Session) -> int:
    if not CROPS_CSV.exists():
        return 0

    inserted = 0
    with CROPS_CSV.open("r", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            crop_id = str(row.get("crop_id") or "").strip()
            if not crop_id:
                continue

            model = session.query(Crop).filter(Crop.id == crop_id).first()
            if model is None:
                model = Crop(id=crop_id, name=row.get("crop_name") or crop_id)
                session.add(model)
                inserted += 1

            model.name = row.get("crop_name") or model.name
            model.category = row.get("category") or model.category
            model.water_sensitivity = row.get("water_sensitivity") or model.water_sensitivity
            model.growth_duration_days = _to_int(row.get("growth_duration_days"))
            model.base_yield_t_per_ha = _to_float(row.get("base_yield_t_per_ha") or row.get("typical_yield_t_ha"))
            model.water_requirement_mm = _to_float(row.get("water_requirement_mm"))
            model.ph_min = _to_float(row.get("ph_min"))
            model.ph_max = _to_float(row.get("ph_max"))
            model.ec_max = _to_float(row.get("ec_max"))

    return inserted


def main() -> None:
    settings = get_settings()
    print(f"Bootstrapping F4 seed data into: {settings.resolved_database_url}")

    db = SessionLocal()
    try:
        fields_inserted = seed_fields(db)
        crops_inserted = seed_crops(db)
        db.commit()
        print(f"Fields inserted: {fields_inserted}")
        print(f"Crops inserted: {crops_inserted}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()

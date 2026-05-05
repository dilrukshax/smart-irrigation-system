"""One-shot script: import Hector retail price CSVs into price_records.

Reads all CSV files matching notebooks/data/Hector/retail_prices*.csv and
bulk-inserts them into the price_records table with is_synthetic=False and
source_tag="hector_retail".

Expected CSV columns (case-insensitive):
    crop / item / crop_name
    date / record_date / year_month
    price / price_per_kg / retail_price
    market / market_name (optional)

Usage:
    python scripts/ingest_hector_prices.py
    python scripts/ingest_hector_prices.py --dry-run
    python scripts/ingest_hector_prices.py --csv-dir /custom/path
"""

from __future__ import annotations

import argparse
import logging
import re
import sys
from datetime import date
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
logger = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).parent
SERVICE_ROOT = SCRIPT_DIR.parent
NOTEBOOKS_DIR = SERVICE_ROOT.parent.parent / "services" / "optimize_service" / "notebooks"
DEFAULT_CSV_DIR = SERVICE_ROOT / "notebooks" / "data" / "Hector"

# Canonical crop name → F4 crop_id mapping
CROP_NAME_MAP = {
    "paddy": "paddy", "rice": "rice", "maize": "maize",
    "tomato": "tomato", "onion": "onion", "chili": "chili",
    "green gram": "green_gram", "greengram": "green_gram",
    "black gram": "black_gram", "blackgram": "black_gram",
    "groundnut": "groundnut", "potato": "potato", "cabbage": "cabbage",
    "carrot": "carrot", "beans": "beans", "brinjal": "brinjal",
    "pumpkin": "pumpkin", "banana": "banana", "coconut": "coconut",
    "pepper": "pepper", "cardamom": "cardamom", "tea": "tea",
}


def _resolve_crop_id(raw_name: str) -> str | None:
    cleaned = raw_name.strip().lower()
    for key, crop_id in CROP_NAME_MAP.items():
        if key in cleaned:
            return crop_id
    return None


def _parse_date(raw: str) -> date | None:
    raw = str(raw).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m", "%Y-%m", "%Y"):
        try:
            import datetime as _dt
            d = _dt.datetime.strptime(raw, fmt).date()
            return d
        except ValueError:
            continue
    # Try year-only → Jan 1 of that year
    match = re.fullmatch(r"(\d{4})", raw)
    if match:
        return date(int(match.group(1)), 1, 1)
    return None


def load_csvs(csv_dir: Path) -> list[dict]:
    import glob
    import csv

    rows = []
    patterns = [str(csv_dir / "retail_prices*.csv"), str(csv_dir / "*.csv")]
    found_files = []
    for pat in patterns:
        found_files.extend(glob.glob(pat))
    found_files = list(dict.fromkeys(found_files))

    if not found_files:
        logger.warning("No CSV files found in %s", csv_dir)
        return rows

    for filepath in found_files:
        logger.info("Reading %s", filepath)
        try:
            with open(filepath, newline="", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    rows.append({k.strip().lower(): v for k, v in row.items()})
        except Exception as exc:
            logger.warning("Failed to read %s: %s", filepath, exc)

    logger.info("Loaded %d raw rows from %d files", len(rows), len(found_files))
    return rows


def parse_rows(raw_rows: list[dict]) -> list[dict]:
    parsed = []
    for row in raw_rows:
        crop_key = next((k for k in row if "crop" in k or "item" in k), None)
        date_key = next((k for k in row if "date" in k or "year" in k or "month" in k), None)
        price_key = next((k for k in row if "price" in k or "retail" in k), None)
        market_key = next((k for k in row if "market" in k or "location" in k), None)

        if not crop_key or not date_key or not price_key:
            continue

        crop_id = _resolve_crop_id(row.get(crop_key, ""))
        if not crop_id:
            continue

        parsed_date = _parse_date(row.get(date_key, ""))
        if not parsed_date:
            continue

        try:
            price = float(str(row.get(price_key, "")).replace(",", "").strip())
        except (ValueError, TypeError):
            continue

        if price <= 0:
            continue

        parsed.append({
            "crop_id": crop_id,
            "date": parsed_date,
            "price_per_kg": price,
            "market_name": row.get(market_key or "", "").strip() or None,
            "price_type": "retail",
            "source": "hector_csv",
            "source_tag": "hector_retail",
            "is_synthetic": False,
        })

    logger.info("Parsed %d valid price rows", len(parsed))
    return parsed


def insert_rows(parsed: list[dict], dry_run: bool = False) -> None:
    if dry_run:
        logger.info("DRY RUN — would insert %d rows", len(parsed))
        for row in parsed[:5]:
            logger.info("  Sample: %s", row)
        return

    sys.path.insert(0, str(SERVICE_ROOT))
    from app.data.db import SessionLocal
    from app.data.models_orm import PriceRecord

    db = SessionLocal()
    inserted = 0
    try:
        for row in parsed:
            db.add(PriceRecord(**row))
            inserted += 1
        db.commit()
        logger.info("Inserted %d price records", inserted)
    except Exception as exc:
        db.rollback()
        logger.error("Insert failed: %s", exc)
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import Hector price CSVs into price_records")
    parser.add_argument("--csv-dir", default=str(DEFAULT_CSV_DIR), help="Directory with CSV files")
    parser.add_argument("--dry-run", action="store_true", help="Parse only, do not insert")
    args = parser.parse_args()

    csv_dir = Path(args.csv_dir)
    raw = load_csvs(csv_dir)
    parsed = parse_rows(raw)
    insert_rows(parsed, dry_run=args.dry_run)

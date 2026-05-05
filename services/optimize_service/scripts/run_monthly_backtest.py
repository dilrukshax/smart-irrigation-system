"""Cron-safe monthly model backtest runner for F4."""

from __future__ import annotations

import json
from pathlib import Path

from app.data.db import SessionLocal
from app.services.monitoring_service import MonitoringService


def main() -> int:
    db = SessionLocal()
    try:
        reports = [
            MonitoringService.run_backtest("yield_regressor", db),
            MonitoringService.run_backtest("price_lgb", db),
            MonitoringService.run_backtest("crop_rf", db),
        ]
        print(json.dumps({"reports": reports}, indent=2))
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())

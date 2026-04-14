"""Compatibility shim: gateway implementation moved to services/gateway_service."""

from __future__ import annotations

import os
import sys
from pathlib import Path

_SERVICE_ROOT = Path(__file__).resolve().parents[1] / "services" / "gateway_service"
if str(_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(_SERVICE_ROOT))

from app.main import *  # noqa: F401,F403


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
    )

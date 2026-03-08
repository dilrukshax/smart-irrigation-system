"""
PostgreSQL Repository for IoT Telemetry Data (NeonDB).

Provides methods to:
- Write sensor readings to PostgreSQL
- Query latest readings for a device
- Query readings within a time range
- List all known devices
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.core.config import settings
from app.iot.schemas import TelemetryWithDerived, TelemetryResponse, DeviceInfo

logger = logging.getLogger(__name__)

Base = declarative_base()


class SensorTelemetryModel(Base):
    """SQLAlchemy model for sensor telemetry data."""
    __tablename__ = "sensor_telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String(64), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    soil_ao = Column(Integer, nullable=False)
    soil_do = Column(Integer, nullable=True)
    water_ao = Column(Integer, nullable=False)
    soil_moisture_pct = Column(Float, nullable=False)
    water_level_pct = Column(Float, nullable=False)
    rssi = Column(Integer, nullable=True)
    battery_v = Column(Float, nullable=True)
    firmware = Column(String(32), nullable=True)
    ip = Column(String(45), nullable=True)
    sampling_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PostgresRepository:
    """
    Repository for PostgreSQL (NeonDB) IoT telemetry operations.
    """

    def __init__(self):
        self._engine = None
        self._SessionLocal = None
        self._connected = False

    def connect(self) -> bool:
        """
        Connect to PostgreSQL and create tables if they don't exist.

        Returns:
            True if connection successful.
        """
        if not settings.database_url:
            logger.error("DATABASE_URL is not set. PostgreSQL storage disabled.")
            return False

        try:
            logger.info("Connecting to PostgreSQL (NeonDB)...")

            # NeonDB requires SSL - psycopg2 reads sslmode from the URL
            self._engine = create_engine(
                settings.database_url,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10,
            )

            self._SessionLocal = sessionmaker(bind=self._engine)

            # Create tables
            Base.metadata.create_all(self._engine)

            # Verify connection
            with self._engine.connect() as conn:
                conn.execute(text("SELECT 1"))

            self._connected = True
            logger.info("PostgreSQL (NeonDB) connected and tables ready.")
            return True

        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            self._connected = False
            return False

    def disconnect(self) -> None:
        """Close PostgreSQL connection pool."""
        if self._engine:
            self._engine.dispose()
            self._connected = False
            logger.info("PostgreSQL connection pool closed.")

    @property
    def is_connected(self) -> bool:
        return self._connected

    def write_point(self, telemetry: TelemetryWithDerived) -> bool:
        """
        Insert a telemetry data point into PostgreSQL.

        Args:
            telemetry: Processed telemetry with derived values.

        Returns:
            True if write successful.
        """
        if not self._connected or not self._SessionLocal:
            logger.error("PostgreSQL not connected — cannot write telemetry.")
            return False

        try:
            row = SensorTelemetryModel(
                device_id=telemetry.device_id,
                timestamp=telemetry.timestamp,
                soil_ao=telemetry.soil_ao,
                soil_do=telemetry.soil_do,
                water_ao=telemetry.water_ao,
                soil_moisture_pct=telemetry.soil_moisture_pct,
                water_level_pct=telemetry.water_level_pct,
                rssi=telemetry.rssi,
                battery_v=telemetry.battery_v,
                firmware=telemetry.firmware,
                ip=telemetry.ip,
                sampling_ms=telemetry.sampling_ms,
            )

            with self._SessionLocal() as session:
                session.add(row)
                session.commit()

            return True

        except Exception as e:
            logger.error(f"Failed to write telemetry to PostgreSQL: {e}")
            return False

    def query_latest(self, device_id: str) -> Optional[TelemetryResponse]:
        """
        Get the latest telemetry reading for a device.

        Args:
            device_id: Device identifier.

        Returns:
            Latest reading as TelemetryResponse or None.
        """
        if not self._connected or not self._SessionLocal:
            return None

        try:
            with self._SessionLocal() as session:
                row = (
                    session.query(SensorTelemetryModel)
                    .filter(SensorTelemetryModel.device_id == device_id)
                    .order_by(SensorTelemetryModel.timestamp.desc())
                    .first()
                )

                if not row:
                    return None

                return TelemetryResponse(
                    device_id=row.device_id,
                    timestamp=row.timestamp,
                    soil_ao=row.soil_ao,
                    soil_do=row.soil_do,
                    water_ao=row.water_ao,
                    soil_moisture_pct=row.soil_moisture_pct,
                    water_level_pct=row.water_level_pct,
                    rssi=row.rssi,
                    battery_v=row.battery_v,
                )

        except Exception as e:
            logger.error(f"Failed to query latest reading: {e}")
            return None

    def query_range(
        self,
        device_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[TelemetryResponse]:
        """
        Query telemetry within a time range for a device.

        Args:
            device_id: Device identifier.
            start_time: Start of range (default: 24h ago).
            end_time: End of range (default: now).
            limit: Maximum rows.

        Returns:
            List of TelemetryResponse.
        """
        if not self._connected or not self._SessionLocal:
            return []

        try:
            if start_time is None:
                start_time = datetime.utcnow() - timedelta(hours=24)
            if end_time is None:
                end_time = datetime.utcnow()

            with self._SessionLocal() as session:
                rows = (
                    session.query(SensorTelemetryModel)
                    .filter(
                        SensorTelemetryModel.device_id == device_id,
                        SensorTelemetryModel.timestamp >= start_time,
                        SensorTelemetryModel.timestamp <= end_time,
                    )
                    .order_by(SensorTelemetryModel.timestamp.desc())
                    .limit(limit)
                    .all()
                )

                return [
                    TelemetryResponse(
                        device_id=row.device_id,
                        timestamp=row.timestamp,
                        soil_ao=row.soil_ao,
                        soil_do=row.soil_do,
                        water_ao=row.water_ao,
                        soil_moisture_pct=row.soil_moisture_pct,
                        water_level_pct=row.water_level_pct,
                        rssi=row.rssi,
                        battery_v=row.battery_v,
                    )
                    for row in rows
                ]

        except Exception as e:
            logger.error(f"Failed to query range: {e}")
            return []

    def get_all_devices(self) -> List[DeviceInfo]:
        """
        Get list of all devices that have sent telemetry in the last 30 days.

        Returns:
            List of DeviceInfo with latest reading and online status.
        """
        if not self._connected or not self._SessionLocal:
            return []

        try:
            cutoff = datetime.utcnow() - timedelta(days=30)
            online_cutoff = datetime.utcnow() - timedelta(minutes=2)

            with self._SessionLocal() as session:
                # Get distinct device IDs active in last 30 days
                device_ids = (
                    session.query(SensorTelemetryModel.device_id)
                    .filter(SensorTelemetryModel.timestamp >= cutoff)
                    .distinct()
                    .all()
                )

                result = []
                for (device_id,) in device_ids:
                    latest_row = (
                        session.query(SensorTelemetryModel)
                        .filter(SensorTelemetryModel.device_id == device_id)
                        .order_by(SensorTelemetryModel.timestamp.desc())
                        .first()
                    )

                    latest = None
                    last_seen = None
                    is_online = False

                    if latest_row:
                        last_seen = latest_row.timestamp
                        is_online = last_seen >= online_cutoff
                        latest = TelemetryResponse(
                            device_id=latest_row.device_id,
                            timestamp=latest_row.timestamp,
                            soil_ao=latest_row.soil_ao,
                            soil_do=latest_row.soil_do,
                            water_ao=latest_row.water_ao,
                            soil_moisture_pct=latest_row.soil_moisture_pct,
                            water_level_pct=latest_row.water_level_pct,
                            rssi=latest_row.rssi,
                            battery_v=latest_row.battery_v,
                        )

                    result.append(DeviceInfo(
                        device_id=device_id,
                        last_seen=last_seen,
                        latest_reading=latest,
                        is_online=is_online,
                    ))

                return result

        except Exception as e:
            logger.error(f"Failed to get devices: {e}")
            return []


# Global instance
pg_repo = PostgresRepository()

"""
InfluxDB Repository for IoT Telemetry Data.

Provides methods to:
- Write sensor readings to InfluxDB
- Query latest readings for a device
- Query readings within a time range
- List all known devices
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List

from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
from influxdb_client.client.exceptions import InfluxDBError

from app.core.config import settings
from app.iot.schemas import TelemetryWithDerived, TelemetryResponse, DeviceInfo

logger = logging.getLogger(__name__)


class InfluxRepository:
    """
    Repository for InfluxDB operations.
    
    Measurement: sensor_readings
    Tags: device_id
    Fields: soil_ao, soil_do, water_ao, soil_moisture_pct, water_level_pct, rssi, battery_v
    """
    
    MEASUREMENT = "sensor_readings"
    
    def __init__(self):
        """Initialize InfluxDB client."""
        self._client: Optional[InfluxDBClient] = None
        self._write_api = None
        self._query_api = None
        self._connected = False
    
    def connect(self) -> bool:
        """
        Connect to InfluxDB.
        
        Returns:
            True if connection successful, False otherwise.
        """
        try:
            logger.info(f"Connecting to InfluxDB at {settings.influxdb_url}")
            
            self._client = InfluxDBClient(
                url=settings.influxdb_url,
                token=settings.influxdb_token,
                org=settings.influxdb_org,
            )
            
            # Test connection with a health check
            health = self._client.health()
            if health.status == "pass":
                self._write_api = self._client.write_api(write_options=SYNCHRONOUS)
                self._query_api = self._client.query_api()
                self._connected = True
                logger.info("Successfully connected to InfluxDB")
                return True
            else:
                logger.error(f"InfluxDB health check failed: {health.message}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to connect to InfluxDB: {e}")
            self._connected = False
            return False
    
    def disconnect(self) -> None:
        """Close InfluxDB connection."""
        if self._client:
            self._client.close()
            self._connected = False
            logger.info("Disconnected from InfluxDB")
    
    @property
    def is_connected(self) -> bool:
        """Check if connected to InfluxDB."""
        return self._connected
    
    def write_point(self, telemetry: TelemetryWithDerived) -> bool:
        """
        Write a telemetry data point to InfluxDB.
        
        Args:
            telemetry: Telemetry data with derived values.
            
        Returns:
            True if write successful, False otherwise.
        """
        if not self._connected or not self._write_api:
            logger.error("Not connected to InfluxDB")
            return False
        
        try:
            point = (
                Point(self.MEASUREMENT)
                .tag("device_id", telemetry.device_id)
                .field("soil_ao", telemetry.soil_ao)
                .field("water_ao", telemetry.water_ao)
                .field("soil_moisture_pct", telemetry.soil_moisture_pct)
                .field("water_level_pct", telemetry.water_level_pct)
                .time(telemetry.timestamp, WritePrecision.MS)
            )
            
            # Add optional fields if present
            if telemetry.soil_do is not None:
                point = point.field("soil_do", telemetry.soil_do)
            if telemetry.rssi is not None:
                point = point.field("rssi", telemetry.rssi)
            if telemetry.battery_v is not None:
                point = point.field("battery_v", telemetry.battery_v)
            
            # Debug: Log the point details
            logger.debug(f"Writing point: device={telemetry.device_id}, ts={telemetry.timestamp}, bucket={settings.influxdb_bucket}")
            
            self._write_api.write(
                bucket=settings.influxdb_bucket,
                org=settings.influxdb_org,
                record=point,
            )
            
            logger.debug(f"Wrote telemetry for device {telemetry.device_id}")
            return True
            
        except InfluxDBError as e:
            logger.error(f"InfluxDB write error: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error writing to InfluxDB: {e}")
            return False
    
    def query_latest(self, device_id: str) -> Optional[TelemetryResponse]:
        """
        Query the latest reading for a device.
        
        Args:
            device_id: Device identifier.
            
        Returns:
            Latest telemetry response or None if not found.
        """
        if not self._connected or not self._query_api:
            logger.error("Not connected to InfluxDB")
            return None
        
        try:
            query = f'''
                from(bucket: "{settings.influxdb_bucket}")
                |> range(start: -30d)
                |> filter(fn: (r) => r._measurement == "{self.MEASUREMENT}")
                |> filter(fn: (r) => r.device_id == "{device_id}")
                |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
                |> sort(columns: ["_time"], desc: true)
                |> limit(n: 1)
            '''
            
            tables = self._query_api.query(query, org=settings.influxdb_org)
            
            for table in tables:
                for record in table.records:
                    return TelemetryResponse(
                        device_id=record.values.get("device_id", device_id),
                        timestamp=record.get_time(),
                        soil_ao=int(record.values.get("soil_ao", 0)),
                        soil_do=record.values.get("soil_do"),
                        water_ao=int(record.values.get("water_ao", 0)),
                        soil_moisture_pct=float(record.values.get("soil_moisture_pct", 0)),
                        water_level_pct=float(record.values.get("water_level_pct", 0)),
                        rssi=record.values.get("rssi"),
                        battery_v=record.values.get("battery_v"),
                    )
            
            return None
            
        except Exception as e:
            logger.error(f"Error querying latest reading: {e}")
            return None
    
    def query_range(
        self,
        device_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[TelemetryResponse]:
        """
        Query readings within a time range.
        
        Args:
            device_id: Device identifier.
            start_time: Range start (default: 24 hours ago).
            end_time: Range end (default: now).
            limit: Maximum number of results (default: 100).
            
        Returns:
            List of telemetry responses.
        """
        if not self._connected or not self._query_api:
            logger.error("Not connected to InfluxDB")
            return []
        
        # Default time range
        if not start_time:
            start_time = datetime.utcnow() - timedelta(hours=24)
        if not end_time:
            end_time = datetime.utcnow()
        
        start_rfc = start_time.strftime("%Y-%m-%dT%H:%M:%SZ")
        end_rfc = end_time.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        try:
            query = f'''
                from(bucket: "{settings.influxdb_bucket}")
                |> range(start: {start_rfc}, stop: {end_rfc})
                |> filter(fn: (r) => r._measurement == "{self.MEASUREMENT}")
                |> filter(fn: (r) => r.device_id == "{device_id}")
                |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
                |> sort(columns: ["_time"], desc: true)
                |> limit(n: {limit})
            '''
            
            tables = self._query_api.query(query, org=settings.influxdb_org)
            results = []
            
            for table in tables:
                for record in table.records:
                    results.append(TelemetryResponse(
                        device_id=record.values.get("device_id", device_id),
                        timestamp=record.get_time(),
                        soil_ao=int(record.values.get("soil_ao", 0)),
                        soil_do=record.values.get("soil_do"),
                        water_ao=int(record.values.get("water_ao", 0)),
                        soil_moisture_pct=float(record.values.get("soil_moisture_pct", 0)),
                        water_level_pct=float(record.values.get("water_level_pct", 0)),
                        rssi=record.values.get("rssi"),
                        battery_v=record.values.get("battery_v"),
                    ))
            
            return results
            
        except Exception as e:
            logger.error(f"Error querying range: {e}")
            return []
    
    def get_all_devices(self) -> List[DeviceInfo]:
        """
        Get list of all known devices with their latest status.
        
        Returns:
            List of device info objects.
        """
        if not self._connected or not self._query_api:
            logger.error("Not connected to InfluxDB")
            return []
        
        try:
            # Get unique device IDs with their last seen time
            # Use distinct to get unique device_ids first
            query = f'''
                from(bucket: "{settings.influxdb_bucket}")
                |> range(start: -30d)
                |> filter(fn: (r) => r._measurement == "{self.MEASUREMENT}")
                |> filter(fn: (r) => r._field == "soil_ao")
                |> group(columns: ["device_id"])
                |> last()
                |> keep(columns: ["device_id", "_time"])
            '''
            
            logger.debug(f"Querying for devices with query: {query}")
            tables = self._query_api.query(query, org=settings.influxdb_org)
            logger.debug(f"Got {len(tables)} tables from query")
            devices = []
            
            for table in tables:
                for record in table.records:
                    device_id = record.values.get("device_id")
                    last_seen = record.get_time()
                    
                    # Consider device online if seen in last 5 minutes
                    is_online = False
                    if last_seen:
                        delta = datetime.utcnow().replace(tzinfo=last_seen.tzinfo) - last_seen
                        is_online = delta.total_seconds() < 300
                    
                    # Get latest reading
                    latest = self.query_latest(device_id)
                    
                    devices.append(DeviceInfo(
                        device_id=device_id,
                        last_seen=last_seen,
                        latest_reading=latest,
                        is_online=is_online,
                    ))
            
            return devices
            
        except Exception as e:
            logger.error(f"Error getting devices: {e}")
            return []


# Global repository instance
influx_repo = InfluxRepository()

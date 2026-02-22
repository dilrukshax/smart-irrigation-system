"""
CHIRPS & NASA POWER Data Downloader for Udawalawe Reservoir Forecasting
=========================================================================

This module provides utilities to download:
1. CHIRPS (Climate Hazards Group InfraRed Precipitation with Stations) data
2. NASA POWER (Prediction Of Worldwide Energy Resource) meteorological data
3. Compute ET₀ (Reference Evapotranspiration) from NASA POWER data

Author: Smart Irrigation System
Date: 2025
"""

import pandas as pd
import numpy as np
import requests
import os
from datetime import datetime, timedelta
from typing import Tuple, Optional, Dict, List
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class CHIRPSDownloader:
    """Download CHIRPS precipitation data from Climate Hazards Group."""
    
    # CHIRPS data via IRI Data Library (alternative to ClimateSERV)
    CHIRPS_URL = "https://iridl.ldeo.columbia.edu/SOURCES/.UCSB/.CHIRPS/.v2p0/.monthly/.precipitation/data.nc"
    
    # Alternative: AWS S3 endpoint (requires AWS CLI or boto3)
    CHIRPS_AWS_PREFIX = "s3://chg-gebco/CHIRPS-2.0/monthly/tifs"
    
    # ClimateSERV endpoint (alternative method)
    CLIMATESERV_CHIRPS_URL = "https://climateserv.servirglobal.net/api/v2/chirps"
    
    def __init__(self, lat: float, lon: float, cache_dir: str = "chirps_cache"):
        """
        Initialize CHIRPS downloader.
        
        Args:
            lat: Latitude of study area
            lon: Longitude of study area
            cache_dir: Directory to cache downloaded data
        """
        self.lat = lat
        self.lon = lon
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
        
    def download_via_climateserv(self, start_date: str, end_date: str) -> pd.DataFrame:
        """
        Download CHIRPS data via ClimateSERV API.
        
        Args:
            start_date: Start date as 'YYYY-MM-DD'
            end_date: End date as 'YYYY-MM-DD'
            
        Returns:
            DataFrame with precipitation data indexed by date
        """
        try:
            logger.info(f"Downloading CHIRPS from ClimateSERV ({start_date} to {end_date})...")
            
            # ClimateSERV requires polygon geometry; use point buffer
            params = {
                "logitude": self.lon,
                "latitude": self.lat,
                "beginDate": int(datetime.strptime(start_date, "%Y-%m-%d").timestamp()),
                "endDate": int(datetime.strptime(end_date, "%Y-%m-%d").timestamp()),
                "datasetType": "CHIRPS_FINAL_PENTAD"  # or CHIRPS_FINAL_MONTHLY
            }
            
            response = requests.get(f"{self.CLIMATESERV_CHIRPS_URL}/GetDataSeries", params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            if not data.get("data"):
                logger.warning("ClimateSERV returned empty data")
                return pd.DataFrame()
            
            # Parse response (structure depends on ClimateSERV API format)
            records = []
            for entry in data["data"]:
                records.append({
                    "date": datetime.fromtimestamp(entry["date"]),
                    "precipitation_mm": entry["value"]
                })
            
            df = pd.DataFrame(records)
            df["date"] = pd.to_datetime(df["date"])
            df = df.set_index("date").sort_index()
            
            logger.info(f"✓ Downloaded {len(df)} CHIRPS records")
            return df
            
        except Exception as e:
            logger.error(f"CHIRPS download via ClimateSERV failed: {e}")
            return pd.DataFrame()
    
    def download_via_iri_netcdf(self, start_date: str, end_date: str) -> pd.DataFrame:
        """
        Download CHIRPS data via IRI Data Library (NetCDF format).
        
        Requires: xarray, netCDF4
        
        Args:
            start_date: Start date as 'YYYY-MM-DD'
            end_date: End date as 'YYYY-MM-DD'
            
        Returns:
            DataFrame with precipitation data indexed by date
        """
        try:
            import xarray as xr
            logger.info(f"Downloading CHIRPS from IRI ({start_date} to {end_date})...")
            
            # IRI subsetting URL (DODS protocol)
            start_year = datetime.strptime(start_date, "%Y-%m-%d").year
            end_year = datetime.strptime(end_date, "%Y-%m-%d").year
            
            url = (
                f"{self.CHIRPS_URL}?"
                f"X/({self.lon})/{self.lon}/"
                f"Y/({self.lat})/{self.lat}/"
                f"T/(start%3A{start_date})%2F(end%3A{end_date})/"
                f"data.nc"
            )
            
            # Open remote dataset
            ds = xr.open_dataset(url)
            
            # Extract precipitation at point
            precip = ds["precipitation"].isel(Y=0, X=0)
            df = precip.to_series().reset_index()
            df.columns = ["date", "precipitation_mm"]
            df["date"] = pd.to_datetime(df["date"])
            df = df.set_index("date").sort_index()
            
            logger.info(f"✓ Downloaded {len(df)} CHIRPS records from IRI")
            return df
            
        except ImportError:
            logger.warning("xarray/netCDF4 not installed; skipping IRI method")
            return pd.DataFrame()
        except Exception as e:
            logger.error(f"CHIRPS download via IRI failed: {e}")
            return pd.DataFrame()
    
    def generate_synthetic_chirps(self, start_date: str, end_date: str) -> pd.DataFrame:
        """
        Generate synthetic CHIRPS data (for testing when API unavailable).
        
        Uses realistic monthly seasonal patterns for Udawalawe region.
        """
        logger.info("Generating synthetic CHIRPS data (for testing)...")
        
        dates = pd.date_range(start_date, end_date, freq="MS")
        
        # Udawalawe monthly avg precipitation (mm) - typical Sri Lanka pattern
        seasonal_precip = {
            1: 28, 2: 53, 3: 91, 4: 130, 5: 141, 6: 104,
            7: 82, 8: 82, 9: 133, 10: 180, 11: 162, 12: 67
        }
        
        precip = [seasonal_precip.get(d.month, 80) + np.random.normal(0, 15) for d in dates]
        precip = np.maximum(precip, 0)  # Ensure non-negative
        
        df = pd.DataFrame({"date": dates, "precipitation_mm": precip})
        df = df.set_index("date").sort_index()
        
        logger.info(f"✓ Generated {len(df)} synthetic CHIRPS records")
        return df


class NASAPOWERDownloader:
    """Download NASA POWER meteorological data."""
    
    BASE_URL = "https://power.larc.nasa.gov/api/v1/daily"
    
    # Available parameters
    PARAMETERS = {
        "T2M": "Temperature at 2m (°C)",
        "T2M_MAX": "Maximum Temperature (°C)",
        "T2M_MIN": "Minimum Temperature (°C)",
        "RH2M": "Relative Humidity at 2m (%)",
        "WS2M": "Wind Speed at 2m (m/s)",
        "PRECTOT": "Precipitation (mm/day)",
        "ALLSKY_SFC_SW_DWN": "Incoming Solar Radiation (MJ/m²/day)"
    }
    
    def __init__(self, lat: float, lon: float):
        """
        Initialize NASA POWER downloader.
        
        Args:
            lat: Latitude of study area
            lon: Longitude of study area
        """
        self.lat = lat
        self.lon = lon
    
    def download(self, start_date: str, end_date: str, 
                 parameters: Optional[List[str]] = None) -> pd.DataFrame:
        """
        Download NASA POWER meteorological data.
        
        Args:
            start_date: Start date as 'YYYY-MM-DD'
            end_date: End date as 'YYYY-MM-DD'
            parameters: List of parameter codes to download (default: all essential)
            
        Returns:
            DataFrame with meteorological data indexed by date
        """
        if parameters is None:
            parameters = [
                "T2M", "T2M_MAX", "T2M_MIN", 
                "RH2M", "WS2M", "ALLSKY_SFC_SW_DWN"
            ]
        
        try:
            logger.info(f"Downloading NASA POWER data ({start_date} to {end_date})...")
            
            # Format dates for API
            start_date_fmt = start_date.replace("-", "")
            end_date_fmt = end_date.replace("-", "")
            
            params = {
                "start": start_date_fmt,
                "end": end_date_fmt,
                "latitude": self.lat,
                "longitude": self.lon,
                "parameters": ",".join(parameters),
                "community": "ag",  # Agricultural community
                "format": "json"
            }
            
            response = requests.get(f"{self.BASE_URL}", params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if "properties" not in data or "daily" not in data["properties"]:
                logger.error(f"Unexpected NASA POWER response structure: {data}")
                return pd.DataFrame()
            
            daily_data = data["properties"]["daily"]
            
            # Convert to DataFrame
            dates = pd.date_range(start_date, end_date, freq="D")
            records = []
            
            for date_key in daily_data:
                if date_key in ["ALLSKY_SFC_SW_DWN", "T2M", "T2M_MAX", "T2M_MIN", "RH2M", "WS2M"]:
                    continue
                
                # date_key format: YYYYMMDD
                try:
                    date_obj = datetime.strptime(date_key, "%Y%m%d").date()
                    record = {"date": date_obj}
                    
                    for param in parameters:
                        if param in daily_data[date_key]:
                            record[param] = daily_data[date_key][param]
                    
                    if len(record) > 1:  # Has at least one data point
                        records.append(record)
                except ValueError:
                    continue
            
            df = pd.DataFrame(records)
            if df.empty:
                logger.warning("NASA POWER returned empty data")
                return pd.DataFrame()
            
            df["date"] = pd.to_datetime(df["date"])
            df = df.set_index("date").sort_index()
            
            # Rename columns for clarity
            rename_map = {k: f"NASA_{k}" for k in parameters}
            df = df.rename(columns=rename_map)
            
            logger.info(f"✓ Downloaded {len(df)} NASA POWER records")
            return df
            
        except Exception as e:
            logger.error(f"NASA POWER download failed: {e}")
            return pd.DataFrame()


class ETCalculator:
    """Compute ET₀ (Reference Evapotranspiration) from meteorological data."""
    
    @staticmethod
    def compute_et0_fao56(T_mean: float, T_max: float, T_min: float,
                          RH_mean: float, WS: float, Ra: float,
                          elevation: float = 380) -> float:
        """
        Compute ET₀ using FAO-56 Penman-Monteith method.
        
        Args:
            T_mean: Mean daily temperature (°C)
            T_max: Maximum daily temperature (°C)
            T_min: Minimum daily temperature (°C)
            RH_mean: Mean relative humidity (%)
            WS: Wind speed at 2m (m/s)
            Ra: Extraterrestrial radiation (MJ/m²/day)
            elevation: Elevation above sea level (m), default 380m for Udawalawe
            
        Returns:
            ET₀ in mm/day
        """
        # Atmospheric pressure
        P = 101.3 * ((293 - 0.0065 * elevation) / 293) ** 5.26
        
        # Saturation vapor pressure
        e_s_mean = 0.6108 * np.exp((17.27 * T_mean) / (T_mean + 237.3))
        e_s_max = 0.6108 * np.exp((17.27 * T_max) / (T_max + 237.3))
        e_s_min = 0.6108 * np.exp((17.27 * T_min) / (T_min + 237.3))
        e_s = (e_s_max + e_s_min) / 2
        
        # Actual vapor pressure
        e_a = (RH_mean / 100) * e_s_mean
        
        # Slope of saturation vapor pressure curve
        delta = (4098 * e_s_mean) / ((T_mean + 237.3) ** 2)
        
        # Psychrometric constant
        gamma = (0.665 * 10 ** -3) * P
        
        # Net solar radiation (approximation if not provided)
        Rns = 0.77 * Ra  # Assume albedo = 0.23
        
        # Net longwave radiation
        Rnl = (2.042 * 10 ** -10) * (((T_max + 273.15) ** 4 + (T_min + 273.15) ** 4) / 2) * (0.34 - 0.14 * np.sqrt(e_a))
        
        # Net radiation
        Rn = Rns - Rnl
        
        # Wind speed factor
        u2_factor = 0.27 * (1 + (WS / 100))
        
        # ET₀ (Penman-Monteith)
        et0 = (
            (0.408 * delta * (Rn - 0)) +
            (gamma * (Cn / (T_mean + 273.15)) * u2_factor * (e_s - e_a))
        ) / (delta + gamma * (1 + u2_factor))
        
        # Cn constant for grass reference (FAO-56)
        Cn = 900
        
        return max(et0, 0)  # Ensure non-negative
    
    @staticmethod
    def compute_et0_hargreaves(T_mean: float, T_max: float, T_min: float,
                               Ra: float) -> float:
        """
        Compute ET₀ using Hargreaves method (simpler, fewer inputs).
        
        Args:
            T_mean: Mean daily temperature (°C)
            T_max: Maximum daily temperature (°C)
            T_min: Minimum daily temperature (°C)
            Ra: Extraterrestrial radiation (MJ/m²/day)
            
        Returns:
            ET₀ in mm/day
        """
        et0 = 0.0023 * Ra * (T_mean + 17.8) * (T_max - T_min) ** 0.5
        return max(et0, 0)


class DataIntegrator:
    """Integrate CHIRPS, NASA POWER, and computed ET₀ data."""
    
    def __init__(self, lat: float, lon: float, elevation: float = 380):
        """
        Initialize integrator.
        
        Args:
            lat: Latitude of study area
            lon: Longitude of study area
            elevation: Elevation (m)
        """
        self.lat = lat
        self.lon = lon
        self.elevation = elevation
        self.chirps_dl = CHIRPSDownloader(lat, lon)
        self.nasapower_dl = NASAPOWERDownloader(lat, lon)
        self.et_calc = ETCalculator()
    
    def download_all(self, start_date: str, end_date: str, 
                    use_synthetic: bool = False) -> pd.DataFrame:
        """
        Download and integrate all meteorological and precipitation data.
        
        Args:
            start_date: Start date as 'YYYY-MM-DD'
            end_date: End date as 'YYYY-MM-DD'
            use_synthetic: If True, use synthetic CHIRPS for testing
            
        Returns:
            Integrated DataFrame with all variables
        """
        logger.info("="*60)
        logger.info("STARTING INTEGRATED DATA DOWNLOAD")
        logger.info("="*60)
        
        # Download NASA POWER
        nasa_df = self.nasapower_dl.download(start_date, end_date)
        
        # Download CHIRPS (or synthetic)
        if use_synthetic:
            chirps_df = self.chirps_dl.generate_synthetic_chirps(start_date, end_date)
        else:
            # Try ClimateSERV first, fallback to synthetic
            chirps_df = self.chirps_dl.download_via_climateserv(start_date, end_date)
            if chirps_df.empty:
                logger.warning("Falling back to synthetic CHIRPS data")
                chirps_df = self.chirps_dl.generate_synthetic_chirps(start_date, end_date)
        
        # Merge datasets
        if not nasa_df.empty and not chirps_df.empty:
            df = nasa_df.join(chirps_df, how="outer")
        elif not nasa_df.empty:
            df = nasa_df
        elif not chirps_df.empty:
            df = chirps_df
        else:
            logger.error("No data downloaded!")
            return pd.DataFrame()
        
        # Compute ET₀ if NASA POWER data available
        if "NASA_T2M" in df.columns and "NASA_ALLSKY_SFC_SW_DWN" in df.columns:
            logger.info("Computing ET₀ using Hargreaves method...")
            
            # Convert solar radiation from MJ/m²/day to appropriate scale if needed
            df["ET0_mm"] = df.apply(
                lambda row: self.et_calc.compute_et0_hargreaves(
                    row["NASA_T2M"] if pd.notna(row["NASA_T2M"]) else row["NASA_T2M_MAX"],
                    row["NASA_T2M_MAX"] if pd.notna(row["NASA_T2M_MAX"]) else row["NASA_T2M"],
                    row["NASA_T2M_MIN"] if pd.notna(row["NASA_T2M_MIN"]) else row["NASA_T2M"],
                    row["NASA_ALLSKY_SFC_SW_DWN"] if pd.notna(row["NASA_ALLSKY_SFC_SW_DWN"]) else 20
                ) if pd.notna(row["NASA_T2M"]) else np.nan,
                axis=1
            )
            
            logger.info("✓ ET₀ computed")
        
        # Data quality summary
        logger.info("\n" + "="*60)
        logger.info("DATA SUMMARY")
        logger.info("="*60)
        logger.info(f"Date range: {df.index.min()} to {df.index.max()}")
        logger.info(f"Records: {len(df)}")
        logger.info(f"\nColumns and Missing Values:")
        for col in df.columns:
            missing_pct = (df[col].isnull().sum() / len(df)) * 100
            logger.info(f"  {col}: {missing_pct:.1f}% missing")
        
        return df


# Convenience functions
def download_chirps(lat: float, lon: float, start_date: str, end_date: str,
                   use_synthetic: bool = False) -> pd.DataFrame:
    """
    Quick download of CHIRPS precipitation data.
    
    Args:
        lat, lon: Coordinates
        start_date, end_date: Date range as 'YYYY-MM-DD'
        use_synthetic: Use synthetic data for testing
        
    Returns:
        DataFrame with precipitation data
    """
    dl = CHIRPSDownloader(lat, lon)
    if use_synthetic:
        return dl.generate_synthetic_chirps(start_date, end_date)
    return dl.download_via_climateserv(start_date, end_date)


def download_nasa_power(lat: float, lon: float, start_date: str, end_date: str) -> pd.DataFrame:
    """
    Quick download of NASA POWER meteorological data.
    
    Args:
        lat, lon: Coordinates
        start_date, end_date: Date range as 'YYYY-MM-DD'
        
    Returns:
        DataFrame with meteorological data
    """
    dl = NASAPOWERDownloader(lat, lon)
    return dl.download(start_date, end_date)


def download_and_integrate(lat: float, lon: float, start_date: str, end_date: str,
                          elevation: float = 380, use_synthetic_chirps: bool = False) -> pd.DataFrame:
    """
    Download and integrate CHIRPS + NASA POWER + computed ET₀.
    
    Args:
        lat, lon: Coordinates
        start_date, end_date: Date range as 'YYYY-MM-DD'
        elevation: Elevation in meters (default: 380 for Udawalawe)
        use_synthetic_chirps: Use synthetic CHIRPS data for testing
        
    Returns:
        Integrated DataFrame with all meteorological variables
    """
    integrator = DataIntegrator(lat, lon, elevation)
    return integrator.download_all(start_date, end_date, use_synthetic=use_synthetic_chirps)


if __name__ == "__main__":
    # Example usage
    LAT, LON = 6.5, 80.75  # Udawalawe Reservoir
    START_DATE = "2022-01-01"
    END_DATE = "2023-12-31"
    
    # Download data
    df = download_and_integrate(LAT, LON, START_DATE, END_DATE, use_synthetic_chirps=True)
    print(df.head(10))
    print(f"\nShape: {df.shape}")

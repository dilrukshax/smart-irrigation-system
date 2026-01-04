"""
Database Setup Script

This script:
1. Creates the aca_o_db database if it doesn't exist
2. Creates necessary tables
3. Seeds data from CSV files

Usage:
    python setup_database.py
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import logging
from pathlib import Path
import csv
import sys

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Database configuration
# Note: psycopg2 doesn't need URL encoding for the password parameter
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'user': 'postgres',
    'password': 'Charuka@0',  # Special characters are OK here (not in URL)
}

DB_NAME = 'aca_o_db'


def create_database():
    """Create the database if it doesn't exist."""
    try:
        # Connect to PostgreSQL server (postgres database)
        conn = psycopg2.connect(**DB_CONFIG, database='postgres')
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
        exists = cursor.fetchone()

        if not exists:
            logger.info(f"Creating database '{DB_NAME}'...")
            cursor.execute(f'CREATE DATABASE {DB_NAME}')
            logger.info(f"✓ Database '{DB_NAME}' created successfully")
        else:
            logger.info(f"✓ Database '{DB_NAME}' already exists")

        cursor.close()
        conn.close()
        return True

    except Exception as e:
        logger.error(f"Error creating database: {e}")
        return False


def create_tables():
    """Create necessary tables."""
    try:
        # Connect to our database
        conn = psycopg2.connect(**DB_CONFIG, database=DB_NAME)
        cursor = conn.cursor()

        logger.info("Creating tables...")

        # Fields table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fields (
                field_id VARCHAR(20) PRIMARY KEY,
                field_name VARCHAR(100) NOT NULL,
                area_ha DECIMAL(10, 2),
                soil_type VARCHAR(50),
                soil_ph DECIMAL(4, 2),
                soil_ec DECIMAL(4, 2),
                location VARCHAR(100),
                latitude DECIMAL(10, 6),
                longitude DECIMAL(10, 6),
                elevation DECIMAL(10, 2),
                soil_suitability DECIMAL(4, 3),
                water_availability_mm DECIMAL(10, 2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        logger.info("✓ Fields table created/verified")

        # Crops table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS crops (
                crop_id VARCHAR(20) PRIMARY KEY,
                crop_name VARCHAR(100) NOT NULL,
                water_sensitivity VARCHAR(20),
                growth_duration_days INTEGER,
                typical_yield_t_ha DECIMAL(10, 2),
                water_requirement_mm DECIMAL(10, 2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        logger.info("✓ Crops table created/verified")

        conn.commit()
        cursor.close()
        conn.close()

        logger.info("✓ All tables created successfully")
        return True

    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        return False


def seed_data():
    """Seed data from CSV files."""
    try:
        conn = psycopg2.connect(**DB_CONFIG, database=DB_NAME)
        cursor = conn.cursor()

        # Get path to data directory
        data_dir = Path(__file__).parent / 'data'

        # Seed crops
        crops_csv = data_dir / 'crops.csv'
        if crops_csv.exists():
            logger.info("Seeding crops data...")
            with open(crops_csv, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                crops_inserted = 0
                for row in reader:
                    try:
                        cursor.execute("""
                            INSERT INTO crops (
                                crop_id, crop_name, water_sensitivity,
                                growth_duration_days, typical_yield_t_ha, water_requirement_mm
                            ) VALUES (%s, %s, %s, %s, %s, %s)
                            ON CONFLICT (crop_id) DO NOTHING
                        """, (
                            row['crop_id'],
                            row['crop_name'],
                            row['water_sensitivity'],
                            int(row['growth_duration_days']),
                            float(row['typical_yield_t_ha']),
                            float(row['water_requirement_mm'])
                        ))
                        crops_inserted += cursor.rowcount
                    except Exception as e:
                        logger.warning(f"Error inserting crop {row.get('crop_id')}: {e}")

            conn.commit()
            logger.info(f"✓ Inserted {crops_inserted} crops")
        else:
            logger.warning(f"Crops CSV not found at {crops_csv}")

        # Seed fields
        fields_csv = data_dir / 'fields.csv'
        if fields_csv.exists():
            logger.info("Seeding fields data...")
            with open(fields_csv, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                fields_inserted = 0
                for row in reader:
                    try:
                        cursor.execute("""
                            INSERT INTO fields (
                                field_id, field_name, area_ha, soil_type, soil_ph, soil_ec,
                                location, latitude, longitude, elevation,
                                soil_suitability, water_availability_mm
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (field_id) DO NOTHING
                        """, (
                            row['field_id'],
                            row['field_name'],
                            float(row['area_ha']),
                            row['soil_type'],
                            float(row['soil_ph']),
                            float(row['soil_ec']),
                            row['location'],
                            float(row['latitude']),
                            float(row['longitude']),
                            float(row['elevation']),
                            float(row['soil_suitability']),
                            float(row['water_availability_mm'])
                        ))
                        fields_inserted += cursor.rowcount
                    except Exception as e:
                        logger.warning(f"Error inserting field {row.get('field_id')}: {e}")

            conn.commit()
            logger.info(f"✓ Inserted {fields_inserted} fields")
        else:
            logger.warning(f"Fields CSV not found at {fields_csv}")

        cursor.close()
        conn.close()

        logger.info("✓ Data seeding completed")
        return True

    except Exception as e:
        logger.error(f"Error seeding data: {e}")
        return False


def main():
    """Main setup function."""
    logger.info("=" * 60)
    logger.info("Database Setup Script")
    logger.info("=" * 60)

    # Step 1: Create database
    if not create_database():
        logger.error("Failed to create database. Exiting.")
        sys.exit(1)

    # Step 2: Create tables
    if not create_tables():
        logger.error("Failed to create tables. Exiting.")
        sys.exit(1)

    # Step 3: Seed data
    if not seed_data():
        logger.error("Failed to seed data. Exiting.")
        sys.exit(1)

    logger.info("=" * 60)
    logger.info("✓ Database setup completed successfully!")
    logger.info("=" * 60)
    logger.info("")
    logger.info("Next steps:")
    logger.info("1. Restart your backend: uvicorn app.main:app --reload --port 8004")
    logger.info("2. You should see: ✓ Database connection verified")
    logger.info("3. Optional: Switch to real API by setting USE_DEMO=false in web/src/api/f4-acao.api.ts")
    logger.info("")


if __name__ == "__main__":
    main()

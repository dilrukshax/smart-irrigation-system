import asyncio
import os
import sys

# Add services to path so imports work
sys.path.insert(0, os.path.join(os.getcwd(), "services/auth_service"))
from app.db.postgres import Base as AuthBase
import app.models  # Ensure auth models are imported

sys.path.insert(0, os.path.join(os.getcwd(), "services/irrigation_service"))
from app.db.postgres import Base as IrrigBase
# from irrigation_service app.models to ensure they register to Base
import app.models.crop_field  # e.g., anything that registers to Base

from sqlalchemy.ext.asyncio import create_async_engine

url = os.popen("grep NEON_DATABASE_URL .env | cut -d '=' -f 2- | tr -d '\r' | tr -d '\"' | tr -d \"'\"").read().strip()
print(f"Original url: {url}")
if url.startswith("postgres://"):
    url = url.replace("postgres://", "postgresql+asyncpg://")
elif url.startswith("postgresql://"):
    url = url.replace("postgresql://", "postgresql+asyncpg://")

url = url.replace("?sslmode=require&channel_binding=require", "")
url = url.replace("?sslmode=require", "")

print(f"Cleaned url: {url}")

engine = create_async_engine(url, connect_args={"ssl": True})

async def init_all():
    async with engine.begin() as conn:
        print("Dropping public schema...")
        await conn.execute(text("DROP SCHEMA public CASCADE;"))
        await conn.execute(text("CREATE SCHEMA public;"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
        
        print("Creating Auth tables...")
        await conn.run_sync(AuthBase.metadata.create_all)
        
        print("Creating Irrigation tables...")
        await conn.run_sync(IrrigBase.metadata.create_all)
        print("Tables created successfully!")

from sqlalchemy import text
asyncio.run(init_all())

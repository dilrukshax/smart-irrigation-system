import asyncio
from app.db.session import engine, Base
from sqlalchemy import text
from app.models import crop_field, device_pairing, sensor_reading, manual_request, valve_state 
async def init():
    async with engine.begin() as conn:
        print("Running create_all for irrigation...")
        await conn.run_sync(Base.metadata.create_all)
asyncio.run(init())

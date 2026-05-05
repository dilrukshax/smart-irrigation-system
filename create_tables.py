import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

url = os.environ.get("DATABASE_URL")
if not url:
    url = os.popen("grep NEON_DATABASE_URL .env | cut -d '=' -f 2- | tr -d '\r' | tr -d '\"' | tr -d \"'\"").read().strip()
    url = url.replace("postgresql://", "postgresql+asyncpg://")
    url = url.replace("?sslmode=require&channel_binding=require", "")
    url = url.replace("?sslmode=require", "")

engine = create_async_engine(url, connect_args={"ssl": True})

async def init_models():
    # Import all models from auth
    import sys
    sys.path.insert(0, "services/auth_service")
    from app.models import Base as AuthBase
    
    sys.path.insert(0, "services/irrigation_service")
    from app.models import Base as IrrigBase
    
    sys.path.insert(0, "services/optimize_service")
    from app.models import Base as OptBase
    
    # We also need to make sure we use sync engine if create_all requires it,
    # but create_all can be run with run_sync
    async with engine.begin() as conn:
        await conn.run_sync(AuthBase.metadata.create_all)
        await conn.run_sync(IrrigBase.metadata.create_all)
        await conn.run_sync(OptBase.metadata.create_all)

asyncio.run(init_models())
print("All tables created via SQLAlchemy metadata!")

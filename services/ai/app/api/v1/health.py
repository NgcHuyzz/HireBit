from fastapi import APIRouter, HTTPException
from psycopg import AsyncConnection
from redis.asyncio import Redis

from app.core.config import get_settings

router = APIRouter()


@router.get("/live")
async def live() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
async def ready() -> dict[str, object]:
    settings = get_settings()
    dependencies = {"database": "unavailable", "redis": "unavailable"}
    try:
        connection = await AsyncConnection.connect(settings.database_url, connect_timeout=2)
        async with connection:
            async with connection.cursor() as cursor:
                await cursor.execute("SELECT 1")
        dependencies["database"] = "ok"
    except Exception:
        pass
    try:
        redis = Redis.from_url(settings.redis_url, socket_connect_timeout=2, socket_timeout=2)
        try:
            await redis.ping()
            dependencies["redis"] = "ok"
        finally:
            await redis.aclose()
    except Exception:
        pass
    if "unavailable" in dependencies.values():
        raise HTTPException(
            status_code=503, detail={"status": "unavailable", "dependencies": dependencies}
        )
    return {"status": "ok", "dependencies": dependencies}

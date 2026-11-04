from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.db import get_session


router = APIRouter(
    prefix="/health",
    tags=["health"]
)

@router.get("")
async def health_check(session: AsyncSession = Depends(get_session)) -> dict[str, str]:

    await session.execute(text("SELECT 1"))
    await session.close()

    return {"status": "ok", "database": "reachable"} 
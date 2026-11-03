from fastapi import APIRouter
from app.routers import health

router = APIRouter(
    prefix="/api"
)

router.include_router(health.router)
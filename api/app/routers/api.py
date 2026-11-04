from fastapi import APIRouter
from app.routers import health, projects

router = APIRouter(
    prefix="/api"
)

router.include_router(health.router)
router.include_router(projects.router, prefix="/projects")
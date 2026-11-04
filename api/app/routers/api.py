from fastapi import APIRouter
from app.routers import health, projects, documents

router = APIRouter(
    prefix="/api"
)

router.include_router(health.router)
router.include_router(projects.router, prefix="/projects")
router.include_router(documents.router, prefix="/projects")
from fastapi import APIRouter
from app.routers import health, projects, documents, conversations

router = APIRouter(
    prefix="/api"
)

router.include_router(health.router)
router.include_router(projects.router, prefix="/projects")
router.include_router(documents.router, prefix="/projects")
router.include_router(conversations.router) 
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings

from app.routers import api



app = FastAPI(
    title="Chatwave API",
    description="API for Chatwave application",
    version="1.0.0",
)

ALLOWED_ORIGINS = get_settings().cors_allow_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(api.router)

from contextlib import asynccontextmanager

import aio_pika
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.events import setup_topology
from app.routers import api


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: one RabbitMQ connection for the whole API, and the exchanges/queues ready before any request
    connection = await aio_pika.connect_robust(get_settings().rabbitmq_url)
    channel = await connection.channel()
    # app.state: a place to keep objects for the app's lifetime; routes read it through a dependency
    app.state.events_exchange = await setup_topology(channel)

    yield  # the API runs here

    # Shutdown: close cleanly
    await connection.close()


app = FastAPI(
    title="Chatwave API",
    description="API for Chatwave application",
    version="1.0.0",
    lifespan=lifespan,
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

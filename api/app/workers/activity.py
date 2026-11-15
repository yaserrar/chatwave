import logging

from aio_pika.abc import AbstractExchange

from app.workers.base import run

logger = logging.getLogger(__name__)


async def handle(event: str, data: dict, exchange: AbstractExchange) -> None:
    """Gets a copy of every event (its queue is bound with "#"). For now it writes a readable log line."""
    project = data.get("project_id", "-")
    document = data.get("document_id", "-")
    logger.info("ACTIVITY %-18s project=%s document=%s", event, project, document)


if __name__ == "__main__":
    run("q.activity", handle)

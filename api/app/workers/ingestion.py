import uuid

from aio_pika.abc import AbstractExchange

from app.core.events import publish
from app.services.ingestion import process_document
from app.workers.base import run


async def handle(event: str, data: dict, exchange: AbstractExchange) -> None:
    """document.uploaded → extract, chunk, embed (the same work BackgroundTasks used to do).
    The event parameter indicates the type of event received.
    """
    document_id = uuid.UUID(data["document_id"])  # it arrives as text in the JSON
    status = await process_document(document_id)
    if status is None:
        return  # deleted before we got to it: nothing to announce

    # Tell whoever is interested how it went: document.ready or document.failed
    await publish(exchange, f"document.{status}", {"document_id": document_id, "project_id": data["project_id"]})


if __name__ == "__main__":
    run("q.ingestion", handle)

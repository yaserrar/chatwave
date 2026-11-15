import asyncio
import logging

from aio_pika.abc import AbstractExchange

from app.services import storage
from app.workers.base import run

logger = logging.getLogger(__name__)


async def handle(event: str, data: dict, exchange: AbstractExchange) -> None:
    """Deletes the S3 files of deleted documents and projects. boto3 is blocking, so it runs in a thread."""
    if event == "document.deleted":
        await asyncio.to_thread(storage.delete_file, data["storage_path"])
        logger.info("Deleted file %s", data["storage_path"])

    elif event == "project.deleted":
        prefix = storage.project_prefix(data["project_id"])
        count = await asyncio.to_thread(storage.delete_folder, prefix)
        logger.info("Deleted %d files under %s", count, prefix)


if __name__ == "__main__":
    run("q.cleanup", handle)

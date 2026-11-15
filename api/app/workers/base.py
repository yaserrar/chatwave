import asyncio
import json
import logging
from collections.abc import Awaitable, Callable

import aio_pika
from aio_pika.abc import AbstractExchange

from app.core.config import get_settings
from app.core.events import setup_topology

logger = logging.getLogger(__name__)

# What a worker provides: a function that handles one event's data. It also gets the exchange,
# to publish follow-up events (e.g. document.ready).
Handler = Callable[[str, dict, AbstractExchange], Awaitable[None]]


async def consume(queue_name: str, handler: Handler) -> None:
    connection = await aio_pika.connect_robust(get_settings().rabbitmq_url)
    async with connection:
        channel = await connection.channel()
        # One message at a time: RabbitMQ sends the next one only after this one is acked.
        # With several workers, the work is shared fairly.
        await channel.set_qos(prefetch_count=1)
        exchange = await setup_topology(channel)
        queue = await channel.get_queue(queue_name)  # already declared by setup_topology

        logger.info("Waiting for messages on %s", queue_name)
        async with queue.iterator() as messages:
            async for message in messages:
                try:
                    envelope = json.loads(message.body)
                    logger.info("Got %s %s", envelope["event"], envelope["data"])
                    await handler(envelope["event"], envelope["data"], exchange)
                except Exception:
                    # A crash (bug, database down...): don't retry forever, park it in q.dead to look at later.
                    # requeue=False + the queue's x-dead-letter-exchange = goes to chatwave.dead → q.dead
                    logger.exception("Handling failed, message sent to %s", "q.dead")
                    await message.reject(requeue=False)
                else:
                    await message.ack()  # done: RabbitMQ deletes it
                # Stopped with Ctrl+C in the middle? Neither ack nor reject happens: RabbitMQ gives the
                # message back to the queue when the connection closes, and the next worker processes it.


def run(queue_name: str, handler: Handler) -> None:
    """Entry point of a worker script: logs to the terminal, then consumes forever."""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    asyncio.run(consume(queue_name, handler))

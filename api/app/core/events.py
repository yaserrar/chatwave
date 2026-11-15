import json
from datetime import datetime, timezone

import aio_pika
from aio_pika import DeliveryMode, ExchangeType
from aio_pika.abc import AbstractChannel, AbstractExchange

EXCHANGE = "chatwave.events"  # the topic exchange every event goes to
DEAD_EXCHANGE = "chatwave.dead"  # where crashed messages go
DEAD_QUEUE = "q.dead"

# Each queue and the routing keys it listens to (its bindings)
QUEUES = {
    "q.ingestion": ["document.uploaded"],
    "q.cleanup": ["document.deleted", "project.deleted"],
    "q.activity": ["#"],
}


async def setup_topology(channel: AbstractChannel) -> AbstractExchange:
    """
    Creates the exchanges, queues and bindings (if they don't exist yet) and returns the main exchange.
    Called by the API and by every worker at startup, so messages always have somewhere to go.
    """
    # 1. Dead letters: a fanout exchange sends everything it receives to q.dead
    dead_exchange = await channel.declare_exchange(DEAD_EXCHANGE, ExchangeType.FANOUT, durable=True)
    dead_queue = await channel.declare_queue(DEAD_QUEUE, durable=True)
    await dead_queue.bind(dead_exchange)  # fanout: no routing key needed

    # 2. The main exchange: routes each event by its name (the routing key)
    exchange = await channel.declare_exchange(EXCHANGE, ExchangeType.TOPIC, durable=True)

    # 3. One queue per consumer, bound to the events it wants.
    #    x-dead-letter-exchange: a message rejected by a worker goes to chatwave.dead instead of being lost
    for queue_name, routing_keys in QUEUES.items():
        queue = await channel.declare_queue(
            queue_name,
            durable=True,
            arguments={"x-dead-letter-exchange": DEAD_EXCHANGE},
        )
        for routing_key in routing_keys:
            await queue.bind(exchange, routing_key=routing_key)

    return exchange


def make_message(event: str, data: dict) -> aio_pika.Message:
    """The envelope every event uses: what happened, when, and its data."""
    envelope = {
        "event": event,
        "version": 1,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "data": data,
    }
    return aio_pika.Message(
        # default=str: UUIDs and dates inside `data` become text instead of making json.dumps fail
        body=json.dumps(envelope, default=str).encode(),
        content_type="application/json",
        # Written to disk by RabbitMQ: survives a RabbitMQ restart (the queue must be durable too)
        delivery_mode=DeliveryMode.PERSISTENT,
    )


async def publish(exchange: AbstractExchange, event: str, data: dict) -> None:
    """Publishes an event. Its name is the routing key, so the bindings in QUEUES decide where it goes."""
    await exchange.publish(make_message(event, data), routing_key=event)

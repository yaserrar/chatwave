import asyncio, json, sys
import aio_pika

URL = "amqp://guest:guest@localhost:5672/"
QUEUE = "test"


async def main():
    connection = await aio_pika.connect_robust(URL)
    async with connection:
        channel = await connection.channel()
        # Creates the queue if it doesn't exist yet. durable = it survives a RabbitMQ restart
        await channel.declare_queue(QUEUE, durable=True)

        text = sys.argv[1] if len(sys.argv) > 1 else "hello"
        body = json.dumps({"text": text}).encode()
        await channel.default_exchange.publish(
            aio_pika.Message(body=body, delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
            routing_key=QUEUE,  # with the default exchange, routing_key = the queue's name
        )
        print("sent:", body.decode())


asyncio.run(main())

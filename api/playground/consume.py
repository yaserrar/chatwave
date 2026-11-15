import asyncio, json
import aio_pika

URL = "amqp://guest:guest@localhost:5672/"
QUEUE = "test"


async def main():
    connection = await aio_pika.connect_robust(URL)
    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=1)  # one message at a time per consumer
        queue = await channel.declare_queue(QUEUE, durable=True)

        print("waiting for messages... Ctrl+C to stop")
        async with queue.iterator() as messages:
            async for message in messages:
                # process() acks automatically when the block ends without an error
                async with message.process():
                    print("got:", json.loads(message.body))
                    await asyncio.sleep(2)  # pretend this is slow work


asyncio.run(main())

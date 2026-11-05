from openai import AsyncOpenAI

from app.core.config import get_settings

# text-embedding-3-small returns 1536 numbers per text.
# Must match Vector(1536) in app/models/chunk.py.
EMBEDDING_DIMENSIONS = 1536

# Texts per request. One request per chunk would be slow, all chunks at once can exceed OpenAI's request limit.
BATCH_SIZE = 100


def _get_client() -> AsyncOpenAI:
    settings = get_settings()
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set. Add it to api/.env.")
    return AsyncOpenAI(api_key=settings.openai_api_key)


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """One vector per text, in the same order as `texts`. Used for document chunks."""
    if not texts:
        return []

    client = _get_client()
    model = get_settings().embedding_model
    vectors: list[list[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        response = await client.embeddings.create(model=model, input=batch)
        # OpenAI returns them in input order; sorting by index makes that explicit
        for item in sorted(response.data, key=lambda d: d.index):
            vectors.append(item.embedding)

    return vectors


async def embed_query(text: str) -> list[float]:
    """Vector for a user's question. Used later (step 6) to search the chunks."""
    vectors = await embed_texts([text])
    return vectors[0]

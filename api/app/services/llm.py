from collections.abc import AsyncIterator

from anthropic import AsyncAnthropic

from app.core.config import get_settings

# Safety net: if Claude's safety filters decline a request, the API retries it on another model by itself
FALLBACK_BETA = "server-side-fallback-2026-07-01"

REFUSAL_MESSAGE = "I can't answer that question."


def _get_client() -> AsyncAnthropic:
    settings = get_settings()
    if not settings.claude_api_key:
        raise ValueError("CLAUDE_API_KEY is not set. Add it to api/.env.")
    return AsyncAnthropic(api_key=settings.claude_api_key)


class StreamResult:
    """Filled in by `stream_answer` once the answer is complete."""

    refused: bool = False  # True if even the fallback model declined the request


async def stream_answer(system: str, messages: list[dict], result: StreamResult) -> AsyncIterator[str]:
    """
    Sends the instructions and the conversation to Claude, and yields the answer text piece by piece
    as Claude writes it.

    system:   the instructions (Claude takes them separately, not as a message)
    messages: [{"role": "user" | "assistant", "content": "..."}], must start with a "user" message
    result:   read it after the loop: `result.refused` says whether the answer was declined

    With `fallbacks`, a declined request continues on the fallback model inside the same stream, and the
    text already sent stays valid. Only if every model declines is `result.refused` set at the end.
    """
    client = _get_client()

    async with client.beta.messages.stream(
        model=get_settings().llm_model,
        max_tokens=16000,
        system=system,
        messages=messages,
        # How much Claude thinks before answering. "medium" fits answering from documents.
        output_config={"effort": "medium"},
        betas=[FALLBACK_BETA],
        fallbacks="default",
    ) as stream:
        # Only the answer text: thinking is not part of text_stream
        async for text in stream.text_stream:
            yield text
        final = await stream.get_final_message()

    result.refused = final.stop_reason == "refusal"

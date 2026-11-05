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


async def generate_answer(system: str, messages: list[dict]) -> str:
    """
    Sends the instructions and the conversation to Claude and returns the answer text.

    system:   the instructions (Claude takes them separately, not as a message)
    messages: [{"role": "user" | "assistant", "content": "..."}], must start with a "user" message
    """
    client = _get_client()

    response = await client.beta.messages.create(
        model=get_settings().llm_model,
        max_tokens=16000,
        system=system,
        messages=messages,
        # How much Claude thinks before answering. "medium" fits answering from documents.
        output_config={"effort": "medium"},
        betas=[FALLBACK_BETA],
        fallbacks="default",
    )

    # Even the fallback model declined: say so instead of returning an empty answer
    if response.stop_reason == "refusal":
        return REFUSAL_MESSAGE

    # response.content is a list of blocks (thinking, text...): keep only the answer text
    return "".join(block.text for block in response.content if block.type == "text").strip()

"""The answering flow with every external call replaced: no database, no OpenAI, no Claude."""

import asyncio
import uuid
from types import SimpleNamespace

import pytest

from app.models.message import Message
from app.services import rag
from app.services.confidence import NOT_FOUND_MARKER, NOT_FOUND_MESSAGES
from app.services.retrieval import Retrieval, RetrievedChunk

DOC_ID = uuid.uuid4()


def chunk(i: int, page: int = 1) -> RetrievedChunk:
    return RetrievedChunk(i, DOC_ID, "guide.pdf", page, f"passage {i}", 10 * i, 10 * i + 9, 0.5)


class FakeSession:
    def __init__(self):
        self.added = []

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        pass

    async def refresh(self, obj):
        pass


def run_answer(
    monkeypatch,
    *,
    retrieval: Retrieval,
    claude: list[str] | None,
    history=(),
    question="What is it?",
    in_context: Retrieval | None = None,
):
    """
    Runs answer_question; returns (streamed pieces, saved message, whether Claude was called, searched texts).
    `in_context` is what a search with the previous question finds (the same as `retrieval` by default).
    """
    calls = []
    searched = []

    async def fake_history(session, conversation_id):
        return list(history)

    async def fake_embed(text):
        return [0.0] * 3

    async def fake_retrieve(session, project_id, text, vector, **kwargs):
        searched.append(text)
        return in_context if in_context and "\n" in text else retrieval

    async def fake_stream(system, messages, result):
        calls.append(messages)
        for piece in claude or []:
            yield piece

    monkeypatch.setattr(rag, "load_history", fake_history)
    monkeypatch.setattr(rag, "embed_query", fake_embed)
    monkeypatch.setattr(rag, "retrieve", fake_retrieve)
    monkeypatch.setattr(rag, "stream_answer", fake_stream)

    conversation = SimpleNamespace(id=uuid.uuid4(), project_id=uuid.uuid4(), title=None, updated_at=None)

    async def collect():
        items = [item async for item in rag.answer_question(FakeSession(), conversation, question)]
        return [i for i in items if isinstance(i, str)], items[-1]

    pieces, message = asyncio.run(collect())
    assert isinstance(message, Message)
    return pieces, message, bool(calls), searched


def strong() -> Retrieval:
    return Retrieval([chunk(1), chunk(2, page=3), chunk(3)], best_similarity=0.7, coverage=1.0, agreement=True)


def weak() -> Retrieval:
    return Retrieval([chunk(1), chunk(2), chunk(3), chunk(4)], best_similarity=0.05, coverage=0.0, agreement=False)


def test_answer_cites_passages_with_what_the_viewer_needs(monkeypatch):
    pieces, message, called, _ = run_answer(monkeypatch, retrieval=strong(), claude=["It is X [2]", " and Y [1][2]."])
    assert called and "".join(pieces) == "It is X [2] and Y [1][2]."
    assert message.not_found is False
    assert message.confidence == "high"
    assert [s["passage"] for s in message.sources] == [2, 1]  # order of first citation, no duplicates
    assert message.sources[0] == {
        "passage": 2,
        "document_id": str(DOC_ID),
        "filename": "guide.pdf",
        "page_number": 3,
        "chunk_id": 2,
        "char_start": 20,
        "char_end": 29,
        "excerpt": "passage 2",
    }


def test_weak_evidence_skips_claude_and_answers_in_the_question_language(monkeypatch):
    pieces, message, called, _ = run_answer(
        monkeypatch, retrieval=weak(), claude=["should not be used"], question="Les animaux sont-ils acceptés ?"
    )
    assert not called and pieces == []
    assert message.not_found is True
    assert message.content == NOT_FOUND_MESSAGES["fr"]
    assert message.confidence == "low"
    assert [s["passage"] for s in message.sources] == [1, 2, 3]  # the closest passages, at most three


HISTORY = [{"role": "user", "content": "Tell me about refunds"}, {"role": "assistant", "content": "…"}]


def test_a_standalone_question_in_a_conversation_still_hits_the_floor(monkeypatch):
    _, message, called, searched = run_answer(
        monkeypatch,
        retrieval=weak(),
        claude=["Canberra."],
        history=HISTORY,
        question="What is the capital of Australia?",
    )
    assert not called and message.not_found is True
    assert searched == ["What is the capital of Australia?"]  # not a follow-up: no second search


def test_a_follow_up_is_searched_with_the_previous_question(monkeypatch):
    _, message, called, searched = run_answer(
        monkeypatch,
        retrieval=weak(),
        in_context=strong(),
        claude=["And more [1]."],
        history=HISTORY,
        question="And the second one?",
    )
    assert searched == ["And the second one?", "Tell me about refunds\nAnd the second one?"]
    assert called and message.not_found is False


def test_a_follow_up_under_the_floor_in_context_too_skips_claude(monkeypatch):
    _, message, called, _ = run_answer(
        monkeypatch, retrieval=weak(), claude=["Guess."], history=HISTORY, question="Why?"
    )
    assert not called and message.not_found is True


def test_weak_but_not_empty_evidence_goes_to_claude_with_low_confidence(monkeypatch):
    # A terse question whose words are in a passage, though not close in meaning ("taux kilométrique")
    some = Retrieval([chunk(1)], best_similarity=0.28, coverage=0.5, agreement=False)
    _, message, called, _ = run_answer(monkeypatch, retrieval=some, claude=["0,45 € [1]."])
    assert called and message.confidence == "low" and message.not_found is False


def test_claude_saying_not_found_is_detected_and_the_marker_never_shown(monkeypatch):
    pieces, message, _, _ = run_answer(
        monkeypatch, retrieval=strong(), claude=["[[NOT_", "FOUND]]\n", "The documents don't cover Bitcoin [1]."]
    )
    assert NOT_FOUND_MARKER not in "".join(pieces)
    assert message.not_found is True
    assert message.content == "The documents don't cover Bitcoin [1]."
    assert [s["passage"] for s in message.sources] == [1, 2, 3]


@pytest.mark.parametrize("answer, expected", [("No citation.", []), ("Bad [9] and [0].", [])])
def test_cited_sources_ignore_missing_passages(answer, expected):
    assert rag.cited_sources(answer, [chunk(1)]) == expected

import uuid

import pytest

from app.services.confidence import (
    EVIDENCE_HIGH,
    EVIDENCE_MEDIUM,
    NOT_FOUND_MARKER,
    NOT_FOUND_MESSAGES,
    SIMILARITY_FLOOR,
    NotFoundMarker,
    evidence_score,
    grade,
    is_document_wide,
    is_follow_up,
    not_found_message,
    question_language,
)
from app.services.retrieval import Retrieval, RetrievedChunk


def make_retrieval(similarity: float, coverage: float = 0.0, agreement: bool = False, chunks: int = 3) -> Retrieval:
    passages = [
        RetrievedChunk(i, uuid.uuid4(), "doc.md", 1, f"passage {i}", None, None, similarity) for i in range(chunks)
    ]
    return Retrieval(chunks=passages, best_similarity=similarity, coverage=coverage, agreement=agreement)


class TestGrade:
    def test_evidence_adds_keyword_coverage_to_similarity(self):
        assert evidence_score(make_retrieval(0.4, coverage=1.0)) == pytest.approx(0.65)

    def test_high_needs_strong_evidence_and_agreement(self):
        assert grade(make_retrieval(EVIDENCE_HIGH, agreement=True), "q") == "high"
        assert grade(make_retrieval(EVIDENCE_HIGH, agreement=False), "q") == "medium"

    def test_medium_and_low(self):
        assert grade(make_retrieval(EVIDENCE_MEDIUM), "q") == "medium"
        assert grade(make_retrieval(SIMILARITY_FLOOR), "q") == "low"

    def test_under_the_floor_needs_low_similarity_and_no_keyword(self):
        assert grade(make_retrieval(SIMILARITY_FLOOR - 0.01), "What is the capital of Australia?") is None

    def test_any_keyword_found_reaches_claude_with_low_confidence(self):
        # "Quel est le taux kilométrique ?": similarity 0.28, "kilométrique" found as "kilomètre"
        assert grade(make_retrieval(0.28, coverage=0.5), "Quel est le taux kilométrique ?") == "low"

    def test_close_meaning_without_keywords_reaches_claude(self):
        assert grade(make_retrieval(SIMILARITY_FLOOR + 0.01), "How do I get my money back?") == "low"

    def test_document_wide_questions_always_reach_claude(self):
        assert grade(make_retrieval(0.1), "Summarise these documents in a few bullet points.") == "low"

    def test_a_precise_question_that_mentions_the_documents_still_hits_the_floor(self):
        assert grade(make_retrieval(0.1), "What is the capital of Australia, according to the documents?") is None

    def test_no_passages_is_none_even_for_document_wide_questions(self):
        assert grade(make_retrieval(0.9, chunks=0), "Summarise these documents") is None


@pytest.mark.parametrize(
    "question, expected",
    [
        ("Summarise these documents in a few bullet points.", True),
        ("Which topics do these documents cover?", True),
        ("Give me an overview", True),
        ("What are these files about?", True),
        ("What is this about?", True),
        ("List the main points of this PDF", True),
        ("TL;DR", True),
        ("Résume ces documents", True),
        ("De quoi parlent mes fichiers ?", True),
        ("Quels sont les sujets principaux ?", True),
        ("What does error ORB-4471 mean?", False),
        ("How many days of vacation do I get?", False),
        ("What is the capital of Australia, according to the documents?", False),
        ("Do the files mention Bitcoin?", False),
        ("What topic is the weather in Paris today?", False),
        ("Who won the 2018 World Cup? Check the document.", False),
        ("Summarise the weather in Paris", False),
        ("What are the key points about refunds?", False),
    ],
)
def test_is_document_wide(question, expected):
    assert is_document_wide(question) is expected


@pytest.mark.parametrize(
    "question, expected",
    [
        ("And the second one?", True),
        ("Why?", True),
        ("Et à Lyon ?", True),
        ("What about Lyon?", True),
        ("Does it cover glasses too?", True),
        ("Pourquoi ça ?", True),
        ("Est-ce que celui-ci est remboursé ?", True),
        ("What is the capital of Australia?", False),
        ("How do I configure horizontal pod autoscaling in Kubernetes?", False),
        ("Quel est le prix d'un ticket de métro à Tokyo ?", False),
    ],
)
def test_is_follow_up(question, expected):
    assert is_follow_up(question) is expected


class TestLanguage:
    @pytest.mark.parametrize(
        "question",
        [
            "Quel est le plafond pour une nuit d'hôtel ?",
            "Les animaux sont-ils acceptés au bureau ?",
            "Où est-ce ?",
            "Puis-je obtenir une avance ?",
            "Quel est le taux kilométrique ?",
        ],
    )
    def test_french(self, question):
        assert question_language(question) == "fr"

    @pytest.mark.parametrize("question", ["What is the refund window?", "ORB-4471?", ""])
    def test_english_is_the_default(self, question):
        assert question_language(question) == "en"

    @pytest.mark.parametrize(
        "question",
        [
            "¿Cuál es la capital de Australia?",
            "¿Qué es la política de reembolsos?",
            "Qual è la capitale dell'Australia?",
            "Wie ist das Wetter in Berlin?",
            "Kannst du mir helfen?",
        ],
    )
    def test_other_languages_are_not_taken_for_french(self, question):
        assert question_language(question) == "en"

    def test_not_found_message_follows_the_question(self):
        assert not_found_message("Quelle est la politique sur les animaux ?") == NOT_FOUND_MESSAGES["fr"]
        assert not_found_message("What is the CEO's salary?") == NOT_FOUND_MESSAGES["en"]


def feed_all(pieces: list[str]) -> tuple[str, bool]:
    detector = NotFoundMarker()
    out = []
    for piece in pieces:
        out += detector.feed(piece)
    out += detector.finish()
    return "".join(out), detector.found


class TestNotFoundMarker:
    def test_plain_answer_passes_through_unchanged(self):
        assert feed_all(["Refunds take ", "5 to 10 days [1]."]) == ("Refunds take 5 to 10 days [1].", False)

    def test_marker_in_one_piece_is_removed(self):
        assert feed_all([f"{NOT_FOUND_MARKER}\nThe documents don't say."]) == ("The documents don't say.", True)

    def test_marker_split_across_pieces(self):
        text, found = feed_all(["\n[[NOT", "_FOU", "ND]]", "\n", "Vos documents n'en parlent pas."])
        assert found is True
        assert text.strip() == "Vos documents n'en parlent pas."

    def test_text_that_starts_like_the_marker_is_released(self):
        assert feed_all(["[[N", "ote]] see [1]"]) == ("[[Note]] see [1]", False)

    def test_text_is_released_as_soon_as_it_cannot_be_the_marker(self):
        detector = NotFoundMarker()
        assert detector.feed("[") == []  # might still become the marker
        assert detector.feed("1") == ["[1"]
        assert detector.feed("] says so") == ["] says so"]

    def test_stream_ending_inside_a_possible_marker(self):
        assert feed_all(["[[NOT_"]) == ("[[NOT_", False)

    def test_marker_later_in_the_text_is_kept(self):
        text, found = feed_all(["Part of it [1]. ", f"{NOT_FOUND_MARKER} the rest"])
        assert found is False
        assert NOT_FOUND_MARKER in text

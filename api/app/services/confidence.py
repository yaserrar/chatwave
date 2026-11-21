"""
How much to trust an answer, and what to say when the documents don't answer the question.

Confidence comes from the retrieved evidence, before Claude writes anything:
- **similarity**: how close in meaning the best passage is to the question (cosine similarity of the
  text-embedding-3-small vectors);
- **coverage**: the share of the question's keywords found in the best-covering passage;
- **agreement**: the closest passage in meaning is also the best keyword match.

Similarity and coverage add up to an evidence score, which sets the badge (high, medium, low).

Claude is not called only when both signals are weak: no passage is close in meaning AND none of the question's
keywords appears in the passages found. Refusing an answerable question is worse than one more call to Claude,
which says itself when the passages don't contain the answer, so a weak but non-zero signal goes to Claude with
low confidence. The thresholds were set on the evaluation set's calibration questions (api/evals) and checked on
held-out questions written afterwards; see report.md.
"""

import re
import unicodedata
from typing import Literal

from app.services.retrieval import Retrieval, keyword_terms

Confidence = Literal["high", "medium", "low"]

# How much the keyword coverage (0 to 1) adds to the similarity (about 0.1 to 0.7 for this model and chunk size)
COVERAGE_WEIGHT = 0.25
# Under this similarity, and with no keyword found, the documents almost certainly don't cover the question
SIMILARITY_FLOOR = 0.30
# From here the evidence is medium; high also needs the vector and keyword searches to agree
EVIDENCE_MEDIUM = 0.45
EVIDENCE_HIGH = 0.60


def _fold(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in decomposed if not unicodedata.combining(c))


def _words(text: str) -> list[str]:
    """Lowercase words without accents; hyphens and apostrophes split words ("puis-je", "d'hôtel")."""
    return re.findall(r"[^\W\d_]+", _fold(text))


# ---------- Kinds of questions ----------

# Questions about the documents as a whole ("summarise these documents") match no passage in particular, so
# their evidence is always weak: they go to Claude whatever the score. To count, a question must ask for a
# summary or the topics, and say nothing else than that: "summarise the weather in Paris" is a precise question.
_SUMMARY_CUES = re.compile(
    r"\b(summar\w*|overview|outline|tl ?;? ?dr|points?|topics?|themes?|subjects?|about|"
    r"resum\w*|synthe\w*|sujets?|parl\w*)\b"
)
_ABOUT_THE_DOCUMENTS = frozenset(
    """
    summary summaries summarize summarise summarized summarised overview outline tldr tl dr key main point points
    topic topics theme themes subject subjects cover covers covered give list brief briefly short quick bullet
    bullets sentence sentences document documents doc docs file files pdf pdfs project content contents
    resume resumer resumes resumez synthese syntheses synthetiser synthetise sujet sujets principaux principales
    principal principale cle cles parle parlent contient contiennent contenu fichier fichiers projet bref
    """.split()
)


def is_document_wide(question: str) -> bool:
    """True for a request about the documents as a whole (a summary, the topics) rather than a precise fact."""
    if not _SUMMARY_CUES.search(" ".join(_words(question))):
        return False
    return all(term in _ABOUT_THE_DOCUMENTS for term in keyword_terms(question))


# A follow-up that leans on the conversation ("and the second one?", "pourquoi ?") finds little on its own.
_FOLLOW_UP_OPENINGS = re.compile(
    r"^(and|but|so|also|then|what about|how about|why|et|mais|donc|alors|aussi|pourquoi)\b"
)
_REFERRING_WORDS = re.compile(
    r"\b(it|its|they|them|their|those|that one|this one|the same|the (first|second|third|last|other) ones?|"
    r"ca|cela|celui|celle|ceux|celles|le meme|la meme|les memes)\b"
)
FOLLOW_UP_MAX_WORDS = 3


def is_follow_up(question: str) -> bool:
    """
    True when the question likely needs the conversation to make sense: no keyword of its own, at most three
    words ("et à Lyon ?"), an opening like "and" or "what about", or a word referring to something said before.
    """
    words = _words(question)
    text = " ".join(words)
    return (
        not keyword_terms(question)
        or len(words) <= FOLLOW_UP_MAX_WORDS
        or bool(_FOLLOW_UP_OPENINGS.search(text) or _REFERRING_WORDS.search(text))
    )


# ---------- Grading ----------


def evidence_score(retrieval: Retrieval) -> float:
    return retrieval.best_similarity + COVERAGE_WEIGHT * retrieval.coverage


def is_under_floor(retrieval: Retrieval) -> bool:
    """No passage close in meaning, and none of the question's keywords in the passages found."""
    return retrieval.best_similarity < SIMILARITY_FLOOR and retrieval.coverage == 0


def grade(retrieval: Retrieval, question: str) -> Confidence | None:
    """
    "high", "medium" or "low", or None when the evidence is under the hard floor and the question is not
    about the documents as a whole: nothing worth sending to Claude.
    """
    if not retrieval.chunks:
        return None
    if is_under_floor(retrieval) and not is_document_wide(question):
        return None
    score = evidence_score(retrieval)
    if score >= EVIDENCE_HIGH and retrieval.agreement:
        return "high"
    if score >= EVIDENCE_MEDIUM:
        return "medium"
    return "low"


# ---------- Not found ----------

Language = Literal["en", "fr"]

# Frequent words that exist in French only (accents removed), and in English only. Words French shares with
# Spanish, Italian or German ("la", "de", "du", "que"...) are left out, so those languages aren't taken for French.
_FRENCH_WORDS = frozenset(
    "le les une des est sont et pour dans sur avec quel quelle quels quelles comment pourquoi combien quand "
    "quoi nous vous ils elles je mon mes notre votre leur ce cette ces pas peut puis faut doit au aux ou".split()
)
_ENGLISH_WORDS = frozenset(
    "the a an is are was were and or for in on with what which how why when who where do does did can "
    "should must our your their this that these those it of to".split()
)
# Letters French uses and Spanish doesn't ("é" is common to both)
_FRENCH_LETTERS = re.compile(r"[àâçèêëîïôûùœæ]", re.IGNORECASE)
# French needs at least two signals: a single "et" or "è" (Italian "è") is not enough
MIN_FRENCH_SIGNALS = 2

NOT_FOUND_MESSAGES: dict[Language, str] = {
    "en": (
        "Your documents don't cover this. I couldn't find anything in this project's documents that answers "
        "the question, so I won't guess."
    ),
    "fr": (
        "Vos documents n'en parlent pas. Je n'ai rien trouvé dans les documents de ce projet qui réponde à la "
        "question, donc je préfère ne pas deviner."
    ),
}


def question_language(question: str) -> Language:
    """French or English (the default, also for other languages), from the question's words and letters."""
    words = _words(question)
    french = sum(word in _FRENCH_WORDS for word in words) + len(_FRENCH_LETTERS.findall(question))
    english = sum(word in _ENGLISH_WORDS for word in words)
    return "fr" if french > english and french >= MIN_FRENCH_SIGNALS else "en"


def not_found_message(question: str) -> str:
    """What the assistant says, in the question's language, when the documents don't answer it."""
    return NOT_FOUND_MESSAGES[question_language(question)]


# Claude starts its answer with this marker when the passages don't contain the answer (see the system
# prompt in rag.py). The API removes it from the text and saves the answer as "not found".
NOT_FOUND_MARKER = "[[NOT_FOUND]]"


class NotFoundMarker:
    """
    Watches the start of a streamed answer for NOT_FOUND_MARKER and removes it.

    The marker can arrive split across pieces ("[[NOT_", "FOUND]]"), so the first characters are held back
    until they either complete the marker or stop matching it; everything after that passes straight through.

        detector = NotFoundMarker()
        for piece in stream:
            yield from detector.feed(piece)
        yield from detector.finish()
        detector.found  # True if the answer started with the marker
    """

    def __init__(self) -> None:
        self.found = False
        self._decided = False
        self._buffer = ""

    def feed(self, text: str) -> list[str]:
        if self._decided:
            return [text] if text else []
        self._buffer += text
        head = self._buffer.lstrip()
        if head.startswith(NOT_FOUND_MARKER):
            self.found = True
            return self._release(head[len(NOT_FOUND_MARKER) :].lstrip())
        if NOT_FOUND_MARKER.startswith(head):
            return []  # could still become the marker: wait for more
        return self._release(self._buffer)

    def finish(self) -> list[str]:
        """The stream ended: whatever is still held back was not the marker."""
        return [] if self._decided else self._release(self._buffer)

    def _release(self, text: str) -> list[str]:
        self._decided = True
        self._buffer = ""
        return [text] if text else []

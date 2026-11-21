"""Scoring for the evaluation harness: is a passage the expected source, hit rate at k, mean reciprocal rank."""

import re
import unicodedata
from collections.abc import Sequence
from dataclasses import dataclass


@dataclass(frozen=True)
class Expected:
    """Where the answer to a question lives. `page` and `phrase` are optional, extra conditions."""

    document: str
    page: int | None = None
    phrase: str | None = None


@dataclass(frozen=True)
class Passage:
    filename: str
    page_number: int
    content: str


def normalize(text: str) -> str:
    """Lowercase, accents removed, any run of whitespace (PDF line breaks included) turned into one space."""
    decomposed = unicodedata.normalize("NFKD", text.lower())
    folded = "".join(c for c in decomposed if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", folded).strip()


def is_hit(expected: Expected, passage: Passage) -> bool:
    """The passage comes from the expected document (and page), and contains the expected phrase."""
    if passage.filename != expected.document:
        return False
    if expected.page is not None and passage.page_number != expected.page:
        return False
    return expected.phrase is None or normalize(expected.phrase) in normalize(passage.content)


def first_hit_rank(expected: Expected, passages: Sequence[Passage]) -> int | None:
    """1-based position of the first passage that is a hit, or None if none is."""
    return next((rank for rank, passage in enumerate(passages, start=1) if is_hit(expected, passage)), None)


def hit_rate(ranks: Sequence[int | None], k: int) -> float:
    """Share of questions whose expected source is in the top k results."""
    if not ranks:
        return 0.0
    return sum(1 for rank in ranks if rank is not None and rank <= k) / len(ranks)


def mean_reciprocal_rank(ranks: Sequence[int | None]) -> float:
    """Average of 1 / rank of the first hit (0 when there is none): 1.0 means always first."""
    if not ranks:
        return 0.0
    return sum(1 / rank for rank in ranks if rank is not None) / len(ranks)


def share(count: int, total: int) -> str:
    """A count and its share, like "3/4 (75%)"; "–" when there is nothing to count."""
    return f"{count}/{total} ({count / total:.0%})" if total else "–"

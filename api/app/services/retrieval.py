"""
Finding the passages that answer a question: hybrid search, scoped to one project's ready documents.

Two searches run one after the other on the request's database session, then their rankings are merged:
- **vector**: chunks closest in meaning to the question (pgvector, cosine distance). Good at paraphrases.
- **keyword**: chunks containing the question's words (Postgres full-text search). Good at exact names,
  codes and numbers that embeddings blur.
The merge is Reciprocal Rank Fusion: a chunk scores 1 / (RRF_K + rank) in each list it appears in, and the
scores add up. Being near the top of both lists beats being first in only one.
"""

import re
import unicodedata
import uuid
from collections.abc import Hashable, Sequence
from dataclasses import dataclass
from typing import Literal, TypeVar

from sqlalchemy import desc, func, literal_column, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chunk import TEXT_SEARCH_CONFIG, Chunk
from app.models.document import Document

RetrievalMode = Literal["hybrid", "vector", "keyword"]

# The usual constant from the RRF paper (Cormack et al., 2009): it damps the gap between rank 1 and rank 2
RRF_K = 60
# Each search proposes this many candidates per chunk kept, so the fusion has something to choose from
CANDIDATES_PER_RESULT = 4
MIN_CANDIDATES = 20
# Keyword search keeps at most this many words of the question
MAX_QUERY_TERMS = 12

# Words that carry no meaning on their own, in English and French. The "simple" text search configuration
# keeps every word, so they are removed from the question here; otherwise "what is the" matches everything.
STOP_WORDS = frozenset(
    """
    a about above after again against all also am an and any are as at be because been before being below
    between both but by can could did do does doing done down during each else ever few for from further get
    gets got had has have having he her here hers herself him himself his how i if in into is it its itself
    just know let lets like many me might more most much must my myself need no nor not now of off on once
    one only or other our ours ourselves out over own please really same say she should so some still such
    tell than that the their theirs them themselves then there these they thing things this those through to
    too under until up us use very want was way we were what when where which while who whom whose why will
    with would you your yours yourself yourselves
    ai alors as au aussi aux avant avec avez avons c ce ceci cela celle celles celui ces cet cette ceux chaque
    combien comme comment d dans de des dois doit donc du elle elles en entre est et etaient etait etre eu eux
    faire faut il ils j je l la le les leur leurs lui m ma mais me meme mes moi mon n ne ni nos notre nous on
    ont ou par pas peut peuvent peux plus pour pourquoi puis qu quand que quel quelle quelles quels qui quoi s
    sa sans se ses si son sont sur t ta te tes toi ton tous tout toute toutes tres tu un une vos votre vous y
    """.split()
)

T = TypeVar("T", bound=Hashable)


@dataclass
class RetrievedChunk:
    chunk_id: int
    document_id: uuid.UUID
    filename: str
    page_number: int
    content: str
    char_start: int | None
    char_end: int | None
    similarity: float  # cosine similarity to the question (1 = same meaning, 0 = unrelated)
    vector_rank: int | None = None  # 1 = closest in meaning; None if not among the vector candidates
    keyword_rank: int | None = None  # 1 = best keyword match; None if no word matched
    score: float = 0.0  # fused RRF score, the final order


@dataclass
class Retrieval:
    """The passages found for a question, and the evidence used to grade the answer's confidence."""

    chunks: list[RetrievedChunk]  # the passages given to Claude, best first
    best_similarity: float  # the closest chunk's similarity (0 when the project has no chunks)
    coverage: float  # share of the question's keywords found in the best-covering passage (0 to 1)
    agreement: bool  # the closest passage in meaning is also the best keyword match


# ---------- Pure helpers ----------


def _fold(text: str) -> str:
    """Lowercase without accents, like the unaccent dictionary does in Postgres."""
    decomposed = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in decomposed if not unicodedata.combining(c))


def keyword_terms(question: str) -> list[str]:
    """The question's meaningful words: lowercase, accents removed, no stop words, no duplicates."""
    terms: list[str] = []
    for word in re.findall(r"[^\W_]+", _fold(question)):
        if word in STOP_WORDS or (len(word) < 2 and not word.isdigit()) or word in terms:
            continue
        terms.append(word)
        if len(terms) == MAX_QUERY_TERMS:
            break
    return terms


# Endings removed before a word is matched as a prefix, longest first, with the shortest stem each may leave.
# Not a real stemmer: just enough for a plural question to find a singular text ("chargebacks" finds
# "chargeback", "policies" finds "policy") and for French derived words to meet ("kilométrique" finds
# "kilomètre", "remboursement" finds "rembourser"). A stem a bit too short only finds a few more chunks.
# fmt: off
SUFFIXES: tuple[tuple[str, int], ...] = (
    ("ements", 4), ("ement", 4), ("ations", 4), ("ation", 4), ("iques", 4), ("ique", 4),
    ("ings", 4), ("ing", 4), ("ies", 4), ("ied", 4), ("aux", 4),
    ("es", 3), ("ed", 4), ("s", 3), ("e", 4), ("y", 4),
)
# fmt: on


def search_stem(term: str) -> tuple[str, bool]:
    """
    How a keyword is searched: (text, is_prefix). Words of 4+ letters lose one common English or French ending
    and match as prefixes; shorter words stay exact, because "api:*" would also match "apiculture".
    """
    if len(term) < 4:
        return term, False
    for suffix, min_stem in SUFFIXES:
        if term.endswith(suffix) and len(term) - len(suffix) >= min_stem:
            return term[: -len(suffix)], True
    return term, True


def keyword_query(question: str) -> str | None:
    """
    The question as a Postgres tsquery string: its meaningful words joined with OR (`|`), longer words as
    stemmed prefixes (`refund:*` also finds "refunds", "refunded"; "policies" becomes `polic:*`, which finds
    "policy"). None when no meaningful word is left.

    Only letters and digits reach the query, so a question can never inject tsquery syntax.
    """
    parts = []
    for term in keyword_terms(question):
        stem, prefix = search_stem(term)
        part = f"{stem}:*" if prefix else stem
        if part not in parts:
            parts.append(part)
    return " | ".join(parts) or None


def term_coverage(terms: Sequence[str], text: str) -> float:
    """Share of `terms` found in `text`, matched like the tsquery does (stemmed prefixes for longer words)."""
    if not terms:
        return 0.0
    words = set(re.findall(r"[^\W_]+", _fold(text)))

    def found(term: str) -> bool:
        stem, prefix = search_stem(term)
        return stem in words or (prefix and any(word.startswith(stem) for word in words))

    return sum(1 for term in terms if found(term)) / len(terms)


def reciprocal_rank_fusion(rankings: Sequence[Sequence[T]], k: int = RRF_K) -> list[tuple[T, float]]:
    """
    Merges several rankings (best first) into one: each item scores the sum of 1 / (k + rank) over the lists
    it appears in. Sorted by score, best first; ties keep the order in which items were first seen.
    """
    scores: dict[T, float] = {}
    for ranking in rankings:
        for rank, item in enumerate(ranking, start=1):
            scores[item] = scores.get(item, 0.0) + 1.0 / (k + rank)
    # sorted() is stable and dicts keep insertion order, so equal scores stay in first-seen order
    return sorted(scores.items(), key=lambda pair: pair[1], reverse=True)


# ---------- Searches ----------


def _base_query(project_id: uuid.UUID, question_vector: list[float]):
    similarity = (1 - Chunk.embedding.cosine_distance(question_vector)).label("similarity")
    return (
        select(
            Chunk.id,
            Chunk.document_id,
            Document.filename,
            Chunk.page_number,
            Chunk.content,
            Chunk.char_start,
            Chunk.char_end,
            similarity,
        )
        .join(Document, Document.id == Chunk.document_id)
        # Project isolation: never search another project's chunks
        .where(Chunk.project_id == project_id)
        .where(Document.status == "ready")
    )


def _to_chunk(row) -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id=row.id,
        document_id=row.document_id,
        filename=row.filename,
        page_number=row.page_number,
        content=row.content,
        char_start=row.char_start,
        char_end=row.char_end,
        similarity=float(row.similarity),
    )


async def vector_search(
    session: AsyncSession, project_id: uuid.UUID, question_vector: list[float], limit: int
) -> list[RetrievedChunk]:
    """The `limit` chunks closest in meaning to the question."""
    # pgvector: smaller cosine distance = closer meaning
    query = (
        _base_query(project_id, question_vector).order_by(Chunk.embedding.cosine_distance(question_vector)).limit(limit)
    )
    rows = (await session.execute(query)).all()
    return [_to_chunk(row) for row in rows]


async def keyword_search(
    session: AsyncSession, project_id: uuid.UUID, question: str, question_vector: list[float], limit: int
) -> list[RetrievedChunk]:
    """The `limit` chunks sharing the most (and the rarest-in-chunk) words with the question."""
    terms = keyword_query(question)
    if terms is None:
        return []
    tsquery = func.to_tsquery(literal_column(f"'{TEXT_SEARCH_CONFIG}'::regconfig"), terms)
    rank = func.ts_rank_cd(Chunk.search_vector, tsquery)
    query = (
        _base_query(project_id, question_vector)
        .where(Chunk.search_vector.op("@@")(tsquery))
        .order_by(desc(rank), Chunk.id)
        .limit(limit)
    )
    rows = (await session.execute(query)).all()
    return [_to_chunk(row) for row in rows]


async def retrieve(
    session: AsyncSession,
    project_id: uuid.UUID,
    question: str,
    question_vector: list[float],
    *,
    top_k: int,
    mode: RetrievalMode = "hybrid",
) -> Retrieval:
    """
    The `top_k` best passages for the question, with the evidence used to grade the answer's confidence.
    `mode` exists for the evaluation harness (api/evals): the app always uses "hybrid".
    """
    candidates = max(top_k * CANDIDATES_PER_RESULT, MIN_CANDIDATES)
    by_vector = await vector_search(session, project_id, question_vector, candidates) if mode != "keyword" else []
    by_keyword = (
        await keyword_search(session, project_id, question, question_vector, candidates) if mode != "vector" else []
    )

    chunks: dict[int, RetrievedChunk] = {}
    for rank, chunk in enumerate(by_vector, start=1):
        chunk.vector_rank = rank
        chunks[chunk.chunk_id] = chunk
    for rank, chunk in enumerate(by_keyword, start=1):
        chunks.setdefault(chunk.chunk_id, chunk).keyword_rank = rank

    fused = reciprocal_rank_fusion([[c.chunk_id for c in by_vector], [c.chunk_id for c in by_keyword]])
    top = []
    for chunk_id, score in fused[:top_k]:
        chunk = chunks[chunk_id]
        chunk.score = score
        top.append(chunk)

    # The vector list is sorted by similarity, so its first chunk is the closest one in the whole project
    best_similarity = by_vector[0].similarity if by_vector else max((c.similarity for c in top), default=0.0)
    terms = keyword_terms(question)
    return Retrieval(
        chunks=top,
        best_similarity=best_similarity,
        coverage=max((term_coverage(terms, c.content) for c in top), default=0.0),
        agreement=bool(by_vector and by_keyword and by_vector[0].chunk_id == by_keyword[0].chunk_id),
    )

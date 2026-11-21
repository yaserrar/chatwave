"""
Evaluation harness: how well does Chatwave find the right passage, and does it refuse what the documents
don't cover?

It indexes the fixture documents (evals/fixtures) into a throwaway project of the database in api/.env,
asks every question of evals/questions.json, scores vector-only, keyword-only and hybrid retrieval, grades
the evidence like the app does, writes a Markdown report, then deletes the project.

From api/, with the virtualenv active:

    python -m evals.run                                    # retrieval only (OpenAI embeddings, < $0.01)
    python -m evals.run --answers                          # also asks Claude every question (paid)
    python -m evals.run --answers --only orb-4471,no-crypto  # Claude for a few questions only
    python -m evals.run --top-k 3 --report /tmp/report.md

S3 and RabbitMQ are not used: the files are read from disk and indexed in this process.
"""

import os

# The app logs every SQL query when SQL_ECHO is on in api/.env: far too noisy for a report run
os.environ.setdefault("SQL_ECHO", "false")

import argparse
import asyncio
import json
import mimetypes
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import delete, func, select

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.models import Chunk, Conversation, Document, Message, Project, User
from app.services import storage
from app.services.confidence import (
    COVERAGE_WEIGHT,
    EVIDENCE_HIGH,
    EVIDENCE_MEDIUM,
    SIMILARITY_FLOOR,
    Confidence,
    evidence_score,
    grade,
)
from app.services.embeddings import embed_texts
from app.services.ingestion import index_content
from app.services.rag import answer_question
from app.services.retrieval import RetrievalMode, retrieve
from evals.metrics import Expected, Passage, first_hit_rank, hit_rate, is_hit, mean_reciprocal_rank, share

HERE = Path(__file__).parent
MODES: tuple[RetrievalMode, ...] = ("vector", "keyword", "hybrid")


@dataclass
class Question:
    id: str
    question: str
    expected: Expected | None  # None: the documents don't answer it
    holdout: bool  # written after the thresholds were set, to check they hold on new questions

    @property
    def answerable(self) -> bool:
        return self.expected is not None


@dataclass
class AnswerCheck:
    not_found: bool
    cites_expected: bool  # one of the cited passages is the expected source
    confidence: str | None


@dataclass
class Result:
    question: Question
    ranks: dict[str, int | None] = field(default_factory=dict)  # mode -> rank of the first hit
    best_similarity: float = 0.0
    coverage: float = 0.0
    evidence: float = 0.0
    agreement: bool = False
    confidence: Confidence | None = None  # None: under the floor, Claude would not be called
    answer: AnswerCheck | None = None


def load_questions() -> tuple[list[str], list[Question]]:
    data = json.loads((HERE / "questions.json").read_text(encoding="utf-8"))
    questions = [
        Question(
            id=q["id"],
            question=q["question"],
            expected=None if q.get("unanswerable") else Expected(q["document"], q.get("page"), q.get("phrase")),
            holdout=q.get("holdout", False),
        )
        for q in data["questions"]
    ]
    return data["documents"], questions


async def index_fixtures(session, project_id: uuid.UUID, filenames: list[str]) -> int:
    for name in filenames:
        content = (HERE / "fixtures" / name).read_bytes()
        ext = Path(name).suffix.lower()
        doc = Document(
            id=uuid.uuid4(),
            project_id=project_id,
            filename=name,
            mime_type=storage.content_type_for(ext, mimetypes.guess_type(name)[0]),
            size=len(content),
            storage_path=f"evals/{name}",  # never uploaded: nothing to clean up in S3
            status="ready",
        )
        session.add(doc)
        await session.flush()
        await index_content(session, doc, content)
    await session.commit()
    return await session.scalar(select(func.count()).select_from(Chunk).where(Chunk.project_id == project_id))


async def score_retrieval(session, project_id: uuid.UUID, questions: list[Question], top_k: int) -> list[Result]:
    vectors = await embed_texts([q.question for q in questions])  # one request for every question
    results = []
    for q, vector in zip(questions, vectors):
        result = Result(q)
        for mode in MODES:
            retrieval = await retrieve(session, project_id, q.question, vector, top_k=top_k, mode=mode)
            passages = [Passage(c.filename, c.page_number, c.content) for c in retrieval.chunks]
            result.ranks[mode] = first_hit_rank(q.expected, passages) if q.expected else None
            if mode == "hybrid":
                result.best_similarity = retrieval.best_similarity
                result.coverage = retrieval.coverage
                result.evidence = evidence_score(retrieval)
                result.agreement = retrieval.agreement
                result.confidence = grade(retrieval, q.question)
        results.append(result)
    return results


async def check_answers(session, project_id: uuid.UUID, results: list[Result]) -> None:
    """The real answering path (one new conversation per question): calls OpenAI and Claude."""
    for result in results:
        conversation = Conversation(project_id=project_id)
        session.add(conversation)
        await session.commit()
        message = None
        async for item in answer_question(session, conversation, result.question.question):
            if isinstance(item, Message):
                message = item
        assert message is not None
        expected = result.question.expected
        cites_expected = (
            bool(expected)
            and not message.not_found
            and any(
                is_hit(expected, Passage(s["filename"], s["page_number"], s.get("excerpt") or ""))
                for s in message.sources or []
            )
        )
        result.answer = AnswerCheck(message.not_found, cites_expected, message.confidence)
        print(f"  answered {result.question.id}: {'not found' if message.not_found else 'answered'}")


# ---------- Report ----------


def _rank(rank: int | None) -> str:
    return str(rank) if rank is not None else "–"


def render_report(results: list[Result], *, top_k: int, chunk_count: int, documents: list[str]) -> str:
    answerable = [r for r in results if r.question.answerable]
    unanswerable = [r for r in results if not r.question.answerable]
    settings = get_settings()
    lines = [
        "# Chatwave evaluation report",
        "",
        f"Generated by `python -m evals.run` on {datetime.now(timezone.utc):%Y-%m-%d %H:%M} UTC.",
        "",
        f"- Documents: {', '.join(f'`{d}`' for d in documents)} ({chunk_count} chunks)",
        f"- Questions: {len(answerable)} answerable, {len(unanswerable)} the documents don't answer "
        f"({sum(1 for r in results if r.question.holdout)} of them held out, see below)",
        f"- Embeddings: `{settings.embedding_model}`, top-k = {top_k}",
        f"- Evidence = similarity + {COVERAGE_WEIGHT} × keyword coverage. Medium from {EVIDENCE_MEDIUM}, high from "
        f"{EVIDENCE_HIGH} when vector and keyword searches agree. Under the floor (Claude not called): similarity "
        f"under {SIMILARITY_FLOOR} and no keyword of the question in the passages found",
        "",
        "## Retrieval",
        "",
        "A hit is a passage from the expected document (and page, for the PDF) that contains the expected phrase. "
        f"With {chunk_count} chunks, a hit in the top {top_k} is easy: hit@1 and MRR are the numbers that tell "
        "the modes apart.",
        "",
        f"| Mode | Hit@1 | Hit@3 | Hit@{top_k} | MRR |",
        "|---|---|---|---|---|",
    ]
    for mode in MODES:
        ranks = [r.ranks[mode] for r in answerable]
        lines.append(
            f"| {mode} | {hit_rate(ranks, 1):.0%} | {hit_rate(ranks, 3):.0%} | {hit_rate(ranks, top_k):.0%} "
            f"| {mean_reciprocal_rank(ranks):.3f} |"
        )

    def count(group: list[Result], level: Confidence | None) -> int:
        return sum(1 for r in group if r.confidence == level)

    lines += [
        "",
        "## Confidence and refusals (retrieval only, no Claude)",
        "",
        'Questions under the floor are answered "not in your documents" without calling Claude. The thresholds '
        "were set on the calibration questions; the held-out questions were written afterwards (terse, "
        "paraphrased and cross-language ones among them) and were not used to set them.",
        "",
        "| Questions | Set | High | Medium | Low | Under the floor |",
        "|---|---|---|---|---|---|",
    ]
    splits = [("calibration", False), ("held out", True)]
    for label, group in (("Answerable", answerable), ("Not answerable", unanswerable)):
        for split, holdout in splits:
            part = [r for r in group if r.question.holdout is holdout]
            lines.append(
                f"| {label} | {split} | {count(part, 'high')} | {count(part, 'medium')} | {count(part, 'low')} "
                f"| {count(part, None)} |"
            )
    lines.append("")
    for split, holdout in splits:
        part_answerable = [r for r in answerable if r.question.holdout is holdout]
        part_unanswerable = [r for r in unanswerable if r.question.holdout is holdout]
        lines += [
            f"- {split.capitalize()}: answerable questions wrongly refused "
            f"**{share(count(part_answerable, None), len(part_answerable))}**, unanswerable ones refused without "
            f"Claude **{share(count(part_unanswerable, None), len(part_unanswerable))}**",
        ]
    lines += [
        "",
        'Unanswerable questions over the floor go to Claude, which answers "not found" itself when the passages '
        "don't contain the answer (see the answers section when it was run).",
        "",
        "| Question | Set | Similarity | Coverage | Agreement | Evidence | Confidence "
        "| Rank (vector / keyword / hybrid) |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for r in sorted(results, key=lambda r: r.evidence, reverse=True):
        ranks = " / ".join(_rank(r.ranks[mode]) for mode in MODES) if r.question.answerable else "not answerable"
        lines.append(
            f"| `{r.question.id}` | {'held out' if r.question.holdout else 'calibration'} | {r.best_similarity:.3f} "
            f"| {r.coverage:.2f} | {'yes' if r.agreement else 'no'} | {r.evidence:.3f} "
            f"| {r.confidence or 'under the floor'} | {ranks} |"
        )

    checked = [r for r in results if r.answer]
    if checked:
        checked_answerable = [r for r in checked if r.question.answerable]
        checked_unanswerable = [r for r in checked if not r.question.answerable]
        cites = sum(1 for r in checked_answerable if r.answer and r.answer.cites_expected)
        not_found = sum(1 for r in checked_unanswerable if r.answer and r.answer.not_found)
        lines += [
            "",
            "## Answers (Claude)",
            "",
            f"- Questions asked to the real answering path: {len(checked)} of {len(results)}",
            "- Answerable questions whose answer cites the expected source: "
            f"**{share(cites, len(checked_answerable))}**",
            f'- Questions the documents don\'t answer, answered "not found" (floor or Claude): '
            f"**{share(not_found, len(checked_unanswerable))}**",
            "",
            "| Question | Result | Cites the expected source |",
            "|---|---|---|",
        ]
        for r in checked:
            assert r.answer
            outcome = "not found" if r.answer.not_found else f"answered ({r.answer.confidence})"
            cited = ("yes" if r.answer.cites_expected else "no") if r.question.answerable else "–"
            lines.append(f"| `{r.question.id}` | {outcome} | {cited} |")

    return "\n".join(lines) + "\n"


# ---------- Main ----------


async def main(args: argparse.Namespace) -> None:
    documents, questions = load_questions()
    only = {q.strip() for q in args.only.split(",")} if args.only else None
    if only and (unknown := only - {q.id for q in questions}):
        raise SystemExit(f"Unknown question ids: {', '.join(sorted(unknown))}")

    async with SessionLocal() as session:
        user = User(name="Evaluation run")
        session.add(user)
        await session.flush()
        user_id = user.id
        project = Project(name="Evaluation (temporary)", created_by=user_id)
        session.add(project)
        await session.commit()
        try:
            print(f"Indexing {len(documents)} documents…")
            chunk_count = await index_fixtures(session, project.id, documents)
            print(f"Scoring retrieval for {len(questions)} questions…")
            results = await score_retrieval(session, project.id, questions, args.top_k)
            if args.answers:
                selected = [r for r in results if only is None or r.question.id in only]
                print(f"Asking Claude {len(selected)} questions…")
                await check_answers(session, project.id, selected)
        finally:
            # Deleting the guest deletes its project, documents, chunks, conversations and messages
            await session.rollback()
            await session.execute(delete(User).where(User.id == user_id))
            await session.commit()

    report = render_report(results, top_k=args.top_k, chunk_count=chunk_count, documents=documents)
    args.report.write_text(report, encoding="utf-8")
    print(report)
    print(f"Report written to {args.report}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Chatwave's retrieval and answers on the fixture set.")
    parser.add_argument("--top-k", type=int, default=get_settings().retrieval_top_k, help="passages kept per question")
    parser.add_argument("--answers", action="store_true", help="also ask Claude (paid): citations and refusals")
    parser.add_argument("--only", help="with --answers: comma-separated question ids to ask Claude")
    parser.add_argument("--report", type=Path, default=HERE / "report.md", help="where to write the Markdown report")
    asyncio.run(main(parser.parse_args()))

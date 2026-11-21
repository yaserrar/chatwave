import asyncio
import logging
import uuid
from pathlib import Path

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import SessionLocal
from app.models.chunk import Chunk
from app.models.document import Document
from app.services import storage
from app.services.chunking import chunk_pages
from app.services.embeddings import embed_texts
from app.services.extraction import extract_pages

logger = logging.getLogger(__name__)


async def index_content(session: AsyncSession, doc: Document, content: bytes) -> int:
    """
    Extract -> chunk -> embed -> save the chunks of `doc` from the file's bytes. Returns how many chunks were saved.
    Does not commit: the caller decides (and rolls back if this raises).
    """
    ext = Path(doc.storage_path).suffix.lower()
    # pypdf is slow, blocking code: run it in a thread so the rest of the process keeps answering
    pages = await asyncio.to_thread(extract_pages, content, ext)
    chunks = chunk_pages(pages)
    vectors = await embed_texts([chunk.content for chunk in chunks])

    # If the document is processed again, replace its old chunks instead of adding duplicates
    await session.execute(delete(Chunk).where(Chunk.document_id == doc.id))

    for chunk, vector in zip(chunks, vectors):
        session.add(
            Chunk(
                document_id=doc.id,
                project_id=doc.project_id,
                content=chunk.content,
                page_number=chunk.page_number,
                chunk_index=chunk.chunk_index,
                char_start=chunk.char_start,
                char_end=chunk.char_end,
                embedding=vector,
            )
        )

    doc.page_count = max(page for page, _ in pages)
    return len(chunks)


async def process_document(document_id: uuid.UUID) -> str | None:
    """
    Run by the ingestion worker after an upload: download the file from S3, then index it.
    Status goes pending -> processing -> ready, or failed with the error message.
    """
    async with SessionLocal() as session:
        doc = await session.get(Document, document_id)
        if doc is None:
            return None

        doc.status = "processing"
        doc.error_message = None
        await session.commit()

        try:
            content = await asyncio.to_thread(storage.download_file, doc.storage_path)
            count = await index_content(session, doc, content)
            doc.status = "ready"
            await session.commit()
            logger.info("Document %s ready: %d chunks", document_id, count)

            return "ready"
        except Exception as e:
            logger.exception("Processing failed for document %s", document_id)
            # Undo half-saved chunks, then load the document again (the old object is expired after a rollback)
            await session.rollback()
            doc = await session.get(Document, document_id)
            if doc is None:
                return None
            doc.status = "failed"
            doc.error_message = str(e)
            await session.commit()

            return "failed"

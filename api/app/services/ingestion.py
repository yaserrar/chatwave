import asyncio
import logging
import uuid

from sqlalchemy import delete

from app.core.db import SessionLocal
from app.models.chunk import Chunk
from app.models.document import Document
from app.services.chunking import chunk_pages
from app.services.embeddings import embed_texts
from app.services.extraction import extract_pages

logger = logging.getLogger(__name__)


async def process_document(document_id: uuid.UUID) -> None:
    """
    Background task started after an upload: extract -> chunk -> embed -> save chunks.
    Status goes pending -> processing -> ready, or failed with the error message.
    """
    # The request's session is already closed when this runs, so open a new one
    async with SessionLocal() as session:
        doc = await session.get(Document, document_id)
        if doc is None:
            return  # deleted before we started

        doc.status = "processing"
        doc.error_message = None
        await session.commit()

        try:
            # pypdf is slow, blocking code: run it in a thread so the rest of the API keeps answering
            pages = await asyncio.to_thread(extract_pages, doc.storage_path)
            chunks = chunk_pages(pages)
            vectors = await embed_texts([text for _, _, text in chunks])

            # If the document is processed again, replace its old chunks instead of adding duplicates
            await session.execute(delete(Chunk).where(Chunk.document_id == document_id))

            for (page_number, chunk_index, text), vector in zip(chunks, vectors):
                session.add(
                    Chunk(
                        document_id=doc.id,
                        project_id=doc.project_id,
                        content=text,
                        page_number=page_number,
                        chunk_index=chunk_index,
                        embedding=vector,
                    )
                )

            doc.page_count = max(page for page, _ in pages)
            doc.status = "ready"
            await session.commit()
            logger.info("Document %s ready: %d chunks", document_id, len(chunks))

        except Exception as e:
            logger.exception("Processing failed for document %s", document_id)
            # Undo half-saved chunks, then load the document again (the old object is expired after a rollback)
            await session.rollback()
            doc = await session.get(Document, document_id)
            if doc is None:
                return  # deleted while we were processing it
            doc.status = "failed"
            doc.error_message = str(e)
            await session.commit()

"""Ingest an uploaded document into the Boswell corpus + indexes."""

from __future__ import annotations

import asyncio
import logging
import os
import re
import tempfile
import uuid

from app.config import Settings, get_settings
from app.db import SessionLocal
from app.models.document import Document
from app.models.document_job import DocumentJob
from app.models.work import Work
from app.services.chunking import chunk_text
from app.services.memgraph_sync import sync_from_postgres
from app.services.minio_store import get_object_stream, object_exists, put_bytes_at_key
from app.services.ollama_client import embed_texts
from app.services.qdrant_chunks import upsert_chunks

logger = logging.getLogger(__name__)

_SAFE_TITLE_RE = re.compile(r"\s+")


def _title_from_filename(name: str) -> str:
    base = os.path.basename(name)
    base = base.rsplit(".", 1)[0]
    base = base.replace("_", " ").replace("-", " ").strip()
    base = _SAFE_TITLE_RE.sub(" ", base)
    return base or "Untitled"


def _extract_text_with_docling(data: bytes, filename: str) -> str:
    """
    Extract text/markdown from binary documents using Docling.

    Note:
        Docling's Python API expects a file path or URL, so we write to a temp file.
    """
    try:
        from docling.document_converter import DocumentConverter
    except Exception as e:  # pragma: no cover
        raise RuntimeError("Docling is not installed/available in the backend environment") from e

    suffix = ""
    if "." in filename:
        suffix = f".{filename.rsplit('.', 1)[-1]}"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as f:
        f.write(data)
        f.flush()
        converter = DocumentConverter()
        doc = converter.convert(f.name).document
        md = doc.export_to_markdown()
        if not isinstance(md, str) or not md.strip():
            raise RuntimeError("Docling returned empty output")
        return md


def derived_markdown_key(document_id: uuid.UUID) -> str:
    """Build object key for Docling-derived markdown."""
    return f"documents/derived/{document_id}.md"


def _read_object_bytes(object_key: str, settings: Settings) -> bytes:
    stream = get_object_stream(object_key, settings=settings)
    try:
        return stream.read()
    finally:
        stream.close()
        stream.release_conn()


def read_preview_text(doc: Document, settings: Settings | None = None) -> str:
    """UTF-8 text for /preview: plain files or derived markdown after ingest.

    Raises:
        ValueError: If preview is not available yet (e.g. PDF before ingest).
    """
    settings = settings or get_settings()
    name_lower = doc.name.lower()
    if name_lower.endswith((".txt", ".md", ".markdown")):
        return _read_object_bytes(doc.object_key, settings).decode("utf-8", errors="replace")
    derived = derived_markdown_key(doc.id)
    if not object_exists(derived, settings=settings):
        raise ValueError("Preview unavailable until ingest completes for this file type")
    return _read_object_bytes(derived, settings).decode("utf-8", errors="replace")


def read_markdown_for_export(doc: Document, settings: Settings | None = None) -> str:
    """Markdown/plain text for download-md: derived blob, plain files, or Docling on demand.

    Raises:
        ValueError: If the file type cannot be exported as markdown.
        RuntimeError: If Docling fails.
    """
    settings = settings or get_settings()
    derived = derived_markdown_key(doc.id)
    if object_exists(derived, settings=settings):
        return _read_object_bytes(derived, settings).decode("utf-8", errors="replace")
    name_lower = doc.name.lower()
    if name_lower.endswith((".txt", ".md", ".markdown")):
        return _read_object_bytes(doc.object_key, settings).decode("utf-8", errors="replace")
    if name_lower.endswith((".pdf", ".docx", ".pptx", ".xlsx", ".html", ".htm")):
        data = _read_object_bytes(doc.object_key, settings)
        return _extract_text_with_docling(data, doc.name)
    raise ValueError("Unsupported file type for markdown export")


def run_ingest_job(job_id: uuid.UUID, *, settings: Settings | None = None) -> None:
    """
    Background task entrypoint.

    - Reads the document from MinIO
    - Creates a Work row in Postgres
    - Embeds + upserts chunks into Qdrant
    - Best-effort Memgraph sync
    """
    settings = settings or get_settings()
    db = SessionLocal()
    try:
        job = db.get(DocumentJob, job_id)
        if job is None:
            logger.warning("DocumentJob not found: %s", job_id)
            return
        job.status = "running"
        db.commit()

        doc = db.get(Document, job.document_id)
        if doc is None:
            job.status = "failed"
            job.error = "Document not found"
            db.commit()
            return

        name_lower = doc.name.lower()

        stream = get_object_stream(doc.object_key, settings=settings)
        try:
            data = stream.read()
        finally:
            stream.close()
            stream.release_conn()

        if name_lower.endswith((".txt", ".md", ".markdown")):
            text = data.decode("utf-8", errors="replace")
        elif name_lower.endswith((".pdf", ".docx", ".pptx", ".xlsx", ".html", ".htm")):
            text = _extract_text_with_docling(data, doc.name)
            put_bytes_at_key(
                text.encode("utf-8"),
                object_key=derived_markdown_key(doc.id),
                content_type="text/markdown; charset=utf-8",
                settings=settings,
            )
        else:
            job.status = "failed"
            job.error = "Unsupported file type for ingestion"
            db.commit()
            return
        title = _title_from_filename(doc.name)

        work = Work(title=title, author="Uploaded", year=None, content=text, period_id=None)
        db.add(work)
        db.commit()
        db.refresh(work)

        chunks = chunk_text(text, chunk_size=settings.chunk_size, overlap=settings.chunk_overlap)
        vectors = asyncio.run(embed_texts([c[1] for c in chunks], settings=settings))
        upsert_chunks(work.id, work.title, chunks, vectors, settings=settings)

        try:
            sync_from_postgres(db, settings=settings)
        except Exception:
            logger.info("Memgraph sync failed (non-fatal)", exc_info=True)

        job.status = "completed"
        job.chunks = len(chunks)
        job.work_id = work.id
        job.error = None
        db.commit()
    except Exception as e:
        logger.exception("Ingest job failed: %s", job_id)
        job = db.get(DocumentJob, job_id)
        if job is not None:
            job.status = "failed"
            job.error = str(e)
            db.commit()
    finally:
        db.close()


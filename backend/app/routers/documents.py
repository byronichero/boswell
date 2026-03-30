"""Knowledge Base document management and ingest."""

from __future__ import annotations

import html
import logging
import uuid
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import (
    HTMLResponse,
    JSONResponse,
    PlainTextResponse,
    Response,
    StreamingResponse,
)
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import SessionLocal, get_db
from app.models.document import Document
from app.models.document_job import DocumentJob
from app.models.work import Work
from app.services.document_ingest import read_markdown_for_export, read_preview_text, run_ingest_job
from app.services.minio_store import (
    get_object_stream,
    object_exists,
    put_bytes_at_key,
    remove_object,
    stat_object,
)
from app.services.ollama_client import embed_texts
from app.services.qdrant_chunks import search_chunks

router = APIRouter()
logger = logging.getLogger(__name__)

_DOC_NOT_FOUND = "Document not found"
_FILE_UNAVAILABLE = "File not yet available or upload failed"

_UPLOAD_EXT = frozenset(
    {
        ".txt",
        ".md",
        ".markdown",
        ".pdf",
        ".docx",
        ".pptx",
        ".xlsx",
        ".html",
        ".htm",
    }
)


def _safe_upload_suffix(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext in _UPLOAD_EXT:
        return ext
    return ".bin"


def _run_upload_job(
    job_id: uuid.UUID,
    doc_id: uuid.UUID,
    object_key: str,
    data: bytes,
    content_type: str,
) -> None:
    """Persist bytes to MinIO and finalize job state."""
    settings = get_settings()
    db = SessionLocal()
    try:
        job = db.get(DocumentJob, job_id)
        doc = db.get(Document, doc_id)
        if job is None or doc is None:
            return
        job.status = "running"
        db.commit()
        put_bytes_at_key(data, object_key=object_key, content_type=content_type, settings=settings)
        meta = stat_object(object_key, settings=settings)
        doc.size_bytes = int(getattr(meta, "size", None) or len(data))
        job.status = "completed"
        job.chunks = 0
        job.error = None
        db.commit()
    except Exception as e:
        logger.exception("Knowledge base upload failed: job_id=%s", job_id)
        db.rollback()
        try:
            remove_object(object_key, settings=settings)
        except Exception:
            logger.debug("Could not remove partial upload from MinIO", exc_info=True)
        job = db.get(DocumentJob, job_id)
        doc = db.get(Document, doc_id)
        if job is not None:
            job.status = "failed"
            job.error = str(e)[:2000]
        db.commit()
    finally:
        db.close()


@router.get("")
def list_documents(db: Annotated[Session, Depends(get_db)]) -> list[dict[str, Any]]:
    rows = db.execute(select(Document).order_by(Document.created_at.desc())).scalars().all()
    return [
        {
            "id": str(d.id),
            "name": d.name,
            "size_bytes": d.size_bytes,
            "content_type": d.content_type,
            "created_at": d.created_at.isoformat(),
        }
        for d in rows
    ]


@router.post(
    "/upload",
    responses={
        202: {"description": "Upload accepted; poll GET /jobs/{job_id}"},
        409: {"description": "Duplicate document name"},
        413: {"description": "File too large"},
    },
)
async def upload_document(
    background: BackgroundTasks,
    file: Annotated[UploadFile, File(...)],
    db: Annotated[Session, Depends(get_db)],
) -> JSONResponse:
    settings = get_settings()
    max_bytes = settings.max_upload_bytes
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum size of {max_bytes} bytes",
        )

    name = (file.filename or "upload.bin").strip() or "upload.bin"
    dup = db.scalar(select(Document.id).where(func.lower(Document.name) == func.lower(name)))
    if dup is not None:
        raise HTTPException(
            status_code=409,
            detail=f"A document named {name!r} already exists",
        )

    content_type = file.content_type or "application/octet-stream"
    doc_id = uuid.uuid4()
    object_key = f"documents/uploads/{doc_id.hex}{_safe_upload_suffix(name)}"

    doc = Document(
        id=doc_id,
        name=name,
        object_key=object_key,
        content_type=content_type,
        size_bytes=len(data),
    )
    job = DocumentJob(document_id=doc.id, kind="upload", status="pending", chunks=None)
    db.add(doc)
    db.add(job)
    db.commit()
    db.refresh(job)

    background.add_task(_run_upload_job, job.id, doc.id, object_key, data, content_type)

    return JSONResponse(
        status_code=202,
        content={
            "job_id": str(job.id),
            "filename": doc.name,
            "document_id": str(doc.id),
            "message": "Upload accepted; poll job until completed.",
        },
    )


@router.get(
    "/jobs/{job_id}",
    responses={404: {"description": "Job not found"}},
)
def get_job(job_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> dict[str, Any]:
    job = db.get(DocumentJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    doc = db.get(Document, job.document_id)
    filename = doc.name if doc else ""
    return {
        "job_id": str(job.id),
        "kind": job.kind,
        "filename": filename,
        "status": job.status,
        "chunks": job.chunks,
        "work_id": job.work_id,
        "error": job.error,
    }


@router.get(
    "/search",
    responses={503: {"description": "Embeddings or Qdrant unavailable"}},
)
async def search_knowledge_base(
    q: Annotated[str, Query(..., min_length=1)],
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=50)] = 15,
) -> dict[str, Any]:
    """Semantic search over all Qdrant chunks (corpus + ingested uploads)."""
    settings = get_settings()
    try:
        vecs = await embed_texts([q], settings=settings)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Embeddings unavailable: {e!s}") from e
    vec = vecs[0]
    try:
        points = search_chunks(vec, [], limit, settings=settings)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Qdrant search failed: {e!s}") from e

    hits: list[dict[str, Any]] = []
    for pt in points:
        pl = pt.payload or {}
        wid = int(pl.get("work_id", 0))
        wrow = db.execute(select(Work).where(Work.id == wid)).scalars().first()
        title = wrow.title if wrow else str(pl.get("title", ""))
        hits.append(
            {
                "score": float(getattr(pt, "score", None) or 0.0),
                "work_id": wid,
                "work_title": title,
                "chunk_index": int(pl.get("chunk_index", 0)),
                "text": str(pl.get("text", "")),
                "locator": str(pl.get("locator", "")),
            }
        )
    return {"query": q, "hits": hits}


@router.post(
    "/ingest",
    responses={
        404: {"description": "Document not found"},
        409: {"description": "Original file not in storage yet"},
    },
)
def ingest_document(
    background: BackgroundTasks,
    doc_id: Annotated[uuid.UUID, Query(..., alias="doc_id")],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    doc = db.get(Document, doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=_DOC_NOT_FOUND)
    if not object_exists(doc.object_key):
        raise HTTPException(
            status_code=409,
            detail="Original file is not available yet (upload may still be running or failed)",
        )
    job = DocumentJob(document_id=doc.id, kind="ingest", status="pending")
    db.add(job)
    db.commit()
    db.refresh(job)
    background.add_task(run_ingest_job, job.id)
    return {"job_id": str(job.id), "filename": doc.name, "document_id": str(doc.id)}


@router.get(
    "/preview",
    response_class=PlainTextResponse,
    responses={
        404: {"description": "Document not found"},
        415: {"description": "Unsupported preview type"},
    },
)
def preview_document(
    doc_id: Annotated[uuid.UUID, Query(..., alias="doc_id")],
    db: Annotated[Session, Depends(get_db)],
    max_chars: Annotated[int, Query(ge=1, le=200_000)] = 50_000,
) -> str:
    doc = db.get(Document, doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=_DOC_NOT_FOUND)
    if not object_exists(doc.object_key):
        raise HTTPException(
            status_code=404,
            detail=_FILE_UNAVAILABLE,
        )
    try:
        text = read_preview_text(doc, settings=get_settings())
    except ValueError as e:
        raise HTTPException(status_code=415, detail=str(e)) from e
    return text[:max_chars]


@router.get(
    "/preview-html",
    response_class=HTMLResponse,
    responses={
        404: {"description": "Document not found"},
        415: {"description": "Unsupported preview type"},
    },
)
def preview_document_html(
    doc_id: Annotated[uuid.UUID, Query(..., alias="doc_id")],
    db: Annotated[Session, Depends(get_db)],
    max_chars: Annotated[int, Query(ge=1, le=200_000)] = 50_000,
) -> HTMLResponse:
    doc = db.get(Document, doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=_DOC_NOT_FOUND)
    if not object_exists(doc.object_key):
        raise HTTPException(
            status_code=404,
            detail=_FILE_UNAVAILABLE,
        )
    try:
        text = read_preview_text(doc, settings=get_settings())
    except ValueError as e:
        raise HTTPException(status_code=415, detail=str(e)) from e
    snippet = text[:max_chars]
    title_esc = html.escape(doc.name)
    body_esc = html.escape(snippet)
    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>{title_esc}</title>
  <style>
    body {{ font-family: system-ui, sans-serif; max-width: 52rem; margin: 1rem auto;
      padding: 0 1rem; line-height: 1.5; color: #111; }}
    pre {{ white-space: pre-wrap; word-break: break-word; }}
  </style>
</head>
<body>
  <article>
    <h1>{title_esc}</h1>
    <pre>{body_esc}</pre>
  </article>
</body>
</html>"""
    return HTMLResponse(page)


@router.get(
    "/download-md",
    responses={
        404: {"description": "Document not found"},
        415: {"description": "Unsupported export type"},
        503: {"description": "Docling or conversion error"},
    },
)
def download_markdown(
    doc_id: Annotated[uuid.UUID, Query(..., alias="doc_id")],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    doc = db.get(Document, doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=_DOC_NOT_FOUND)
    if not object_exists(doc.object_key):
        raise HTTPException(
            status_code=404,
            detail=_FILE_UNAVAILABLE,
        )
    try:
        text = read_markdown_for_export(doc, settings=get_settings())
    except ValueError as e:
        raise HTTPException(status_code=415, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    base = Path(doc.name).stem or "document"
    filename = f"{base}.md"
    body = text.encode("utf-8")
    return Response(
        content=body,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/download",
    responses={404: {"description": "Document not found"}},
)
def download_document(
    doc_id: Annotated[uuid.UUID, Query(..., alias="doc_id")],
    db: Annotated[Session, Depends(get_db)],
    inline: Annotated[bool, Query()] = False,
):
    doc = db.get(Document, doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=_DOC_NOT_FOUND)
    if not object_exists(doc.object_key):
        raise HTTPException(
            status_code=404,
            detail=_FILE_UNAVAILABLE,
        )
    stream = get_object_stream(doc.object_key)

    def iterator():
        try:
            while True:
                chunk = stream.read(1024 * 1024)
                if not chunk:
                    break
                yield chunk
        finally:
            stream.close()
            stream.release_conn()

    disp = "inline" if inline else "attachment"
    headers = {"Content-Disposition": f'{disp}; filename="{doc.name}"'}
    return StreamingResponse(iterator(), media_type=doc.content_type, headers=headers)

"""Knowledge Base document management and ingest."""

from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import PlainTextResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.document import Document
from app.models.document_job import DocumentJob
from app.services.document_ingest import derived_markdown_key, run_ingest_job
from app.services.minio_store import get_object_stream, object_exists, put_bytes, stat_object

router = APIRouter()

_DOC_NOT_FOUND = "Document not found"


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


@router.post("/upload")
async def upload_document(
    file: Annotated[UploadFile, File(...)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    data = await file.read()
    content_type = file.content_type or "application/octet-stream"
    stored = put_bytes(data, filename=file.filename or "upload.bin", content_type=content_type)
    meta = stat_object(stored.object_key)
    doc = Document(
        name=file.filename or "upload.bin",
        object_key=stored.object_key,
        content_type=content_type,
        size_bytes=int(getattr(meta, "size", None) or len(data)),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    job = DocumentJob(
        document_id=doc.id,
        kind="upload",
        status="completed",
        chunks=0,
        work_id=None,
        error=None,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return {"job_id": str(job.id), "filename": doc.name, "document_id": str(doc.id)}


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
        "filename": filename,
        "status": job.status,
        "chunks": job.chunks,
        "work_id": job.work_id,
        "error": job.error,
    }


@router.post(
    "/ingest",
    responses={404: {"description": "Document not found"}},
)
def ingest_document(
    background: BackgroundTasks,
    doc_id: Annotated[uuid.UUID, Query(..., alias="doc_id")],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    doc = db.get(Document, doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=_DOC_NOT_FOUND)
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
    object_key = doc.object_key
    if not doc.name.lower().endswith((".txt", ".md", ".markdown")):
        candidate = derived_markdown_key(doc.id)
        if not object_exists(candidate):
            raise HTTPException(
                status_code=415,
                detail="Preview unavailable until ingest completes for this file type",
            )
        object_key = candidate

    stream = get_object_stream(object_key)
    try:
        data = stream.read()
    finally:
        stream.close()
        stream.release_conn()
    text = data.decode("utf-8", errors="replace")
    return text[:max_chars]


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


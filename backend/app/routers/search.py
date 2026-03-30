"""Concordance, keywords, semantic search."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.schemas.search import (
    ConcordanceHit,
    ConcordanceResponse,
    KeywordEntry,
    KeywordResponse,
    SemanticHit,
    SemanticSearchRequest,
    SemanticSearchResponse,
)
from app.services.memgraph_sync import work_ids_for_periods
from app.services.ollama_client import embed_texts
from app.services.qdrant_chunks import search_chunks
from app.services.scope import resolve_scope_period_ids, work_ids_for_periods_sql
from app.services.text_analysis import concordance_hits, keyword_frequencies

logger = logging.getLogger(__name__)

router = APIRouter()


def _scoped_work_ids(db: Session, period_id: int | None, soft: bool) -> tuple[list[int], list[int]]:
    settings = get_settings()
    scope_ids, _ = resolve_scope_period_ids(
        db,
        center_period_id=period_id,
        soft=soft,
        neighbor_count=settings.soft_scope_neighbor_periods,
    )
    try:
        neo = work_ids_for_periods(scope_ids)
        if neo:
            return neo, scope_ids
    except Exception:
        logger.warning("Memgraph scope failed; falling back to SQL", exc_info=True)
    return work_ids_for_periods_sql(db, scope_ids), scope_ids


@router.get("/concordance", response_model=ConcordanceResponse)
def concordance(
    q: str = Query(..., min_length=1),
    period_id: int | None = Query(None),
    soft: bool = Query(True),
    context: int = Query(40, ge=5, le=200),
    db: Session = Depends(get_db),
) -> ConcordanceResponse:
    """Keyword-in-context search."""
    work_ids, scope_ids = _scoped_work_ids(db, period_id, soft)
    hits_raw, total = concordance_hits(db, query=q, work_ids=work_ids, context_chars=context)
    hits = [
        ConcordanceHit(
            work_id=h["work_id"],
            work_title=str(h["work_title"]),
            locator=str(h["locator"]),
            before=str(h["before"]),
            keyword=str(h["keyword"]),
            after=str(h["after"]),
        )
        for h in hits_raw
    ]
    return ConcordanceResponse(
        query=q,
        scope_period_ids=scope_ids,
        hits=hits,
        total_hits=total,
    )


@router.get("/keywords", response_model=KeywordResponse)
def keywords(
    period_id: int | None = Query(None),
    soft: bool = Query(True),
    limit: int = Query(50, ge=10, le=200),
    db: Session = Depends(get_db),
) -> KeywordResponse:
    """Top token counts (English stopwords removed)."""
    work_ids, scope_ids = _scoped_work_ids(db, period_id, soft)
    pairs = keyword_frequencies(db, work_ids=work_ids, top_n=limit)
    terms = [KeywordEntry(term=t, count=c) for t, c in pairs]
    return KeywordResponse(scope_period_ids=scope_ids, terms=terms)


@router.post("/semantic", response_model=SemanticSearchResponse)
async def semantic(
    body: SemanticSearchRequest,
    db: Session = Depends(get_db),
) -> SemanticSearchResponse:
    """Vector search over chunks scoped to works."""
    work_ids, scope_ids = _scoped_work_ids(db, body.period_id, body.soft_scope)
    if not work_ids:
        return SemanticSearchResponse(query=body.query, scope_period_ids=scope_ids, hits=[])
    try:
        vecs = await embed_texts([body.query])
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Embeddings unavailable: {e!s}") from e
    vec = vecs[0]
    settings = get_settings()
    try:
        points = search_chunks(vec, work_ids, body.limit, settings=settings)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Qdrant search failed: {e!s}") from e
    from sqlalchemy import select

    from app.models.work import Work

    hits: list[SemanticHit] = []
    for pt in points:
        pl = pt.payload or {}
        wid = int(pl.get("work_id", 0))
        wrow = db.execute(select(Work).where(Work.id == wid)).scalars().first()
        title = wrow.title if wrow else str(pl.get("title", ""))
        hits.append(
            SemanticHit(
                score=float(getattr(pt, "score", None) or 0.0),
                work_id=wid,
                work_title=title,
                chunk_index=int(pl.get("chunk_index", 0)),
                text=str(pl.get("text", "")),
                locator=str(pl.get("locator", "")),
            )
        )
    return SemanticSearchResponse(query=body.query, scope_period_ids=scope_ids, hits=hits)

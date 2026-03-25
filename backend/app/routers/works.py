"""Works browse and text access."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.period import Period
from app.models.work import Work
from app.schemas.search import StylisticsLiteResponse
from app.schemas.work import WorkListItem, WorkRead
from app.services.scope import resolve_scope_period_ids, work_ids_for_periods_sql
from app.services.text_analysis import stylistics_lite

router = APIRouter()


@router.get("", response_model=list[WorkListItem])
def list_works(
    period_id: int | None = Query(None),
    soft: bool = Query(True),
    db: Session = Depends(get_db),
) -> list[WorkListItem]:
    """List works in the current period scope."""
    from app.config import get_settings

    settings = get_settings()
    scope_ids, _ = resolve_scope_period_ids(
        db,
        center_period_id=period_id,
        soft=soft,
        neighbor_count=settings.soft_scope_neighbor_periods,
    )
    wid_list = work_ids_for_periods_sql(db, scope_ids)
    if not wid_list:
        return []
    rows = (
        db.execute(select(Work).where(Work.id.in_(wid_list)).order_by(Work.title.asc()))
        .scalars()
        .all()
    )
    period_map = {p.id: p.name for p in db.execute(select(Period)).scalars().all()}
    out: list[WorkListItem] = []
    for w in rows:
        out.append(
            WorkListItem(
                id=w.id,
                title=w.title,
                author=w.author,
                year=w.year,
                period_id=w.period_id,
                period_name=period_map.get(w.period_id) if w.period_id else None,
            )
        )
    return out


@router.get("/{work_id}", response_model=WorkRead)
def get_work(work_id: int, db: Session = Depends(get_db)) -> WorkRead:
    """Return full work including text."""
    w = db.get(Work, work_id)
    if w is None:
        raise HTTPException(status_code=404, detail="Work not found")
    period_name = None
    if w.period_id:
        p = db.get(Period, w.period_id)
        period_name = p.name if p else None
    return WorkRead(
        id=w.id,
        title=w.title,
        author=w.author,
        year=w.year,
        content=w.content,
        period_id=w.period_id,
        period_name=period_name,
    )


@router.get("/{work_id}/stylistics-lite", response_model=StylisticsLiteResponse)
def work_stylistics(work_id: int, db: Session = Depends(get_db)) -> StylisticsLiteResponse:
    """Observational sentence / dialogue heuristics for one work."""
    w = db.get(Work, work_id)
    if w is None:
        raise HTTPException(status_code=404, detail="Work not found")
    stats = stylistics_lite(w.content)
    return StylisticsLiteResponse(
        work_id=w.id,
        title=w.title,
        char_count=int(stats["char_count"]),
        sentence_count=int(stats["sentence_count"]),
        avg_sentence_length=float(stats["avg_sentence_length"]),
        dialogue_line_markers=int(stats["dialogue_line_markers"]),
    )

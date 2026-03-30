"""Works browse and text access."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.period import Period
from app.models.work import Work
from app.schemas.search import (
    RollingSentencePoint,
    RollingWordWindowPoint,
    StylisticsCompareResponse,
    StylisticsLiteResponse,
    StylisticsRollingResponse,
    WorkStylisticsMeta,
)
from app.schemas.work import WorkListItem, WorkRead
from app.services.scope import resolve_scope_period_ids, work_ids_for_periods_sql
from app.services.text_analysis import (
    rolling_sentence_word_lengths,
    rolling_word_windows,
    stylistics_lite,
    word_token_count,
)

router = APIRouter()


def _stylistics_lite_response(w: Work, stats: dict[str, float | int]) -> StylisticsLiteResponse:
    return StylisticsLiteResponse(
        work_id=w.id,
        title=w.title,
        char_count=int(stats["char_count"]),
        sentence_count=int(stats["sentence_count"]),
        avg_sentence_length=float(stats["avg_sentence_length"]),
        dialogue_line_markers=int(stats["dialogue_line_markers"]),
        avg_words_per_sentence=float(stats["avg_words_per_sentence"]),
        word_count=int(stats["word_count"]),
        unique_word_types=int(stats["unique_word_types"]),
        type_token_ratio=float(stats["type_token_ratio"]),
        comma_count=int(stats["comma_count"]),
        semicolon_count=int(stats["semicolon_count"]),
        colon_count=int(stats["colon_count"]),
        question_mark_count=int(stats["question_mark_count"]),
        exclamation_mark_count=int(stats["exclamation_mark_count"]),
        dash_em_en_count=int(stats["dash_em_en_count"]),
        paren_open_count=int(stats["paren_open_count"]),
        paren_close_count=int(stats["paren_close_count"]),
        comma_per_1k_words=float(stats["comma_per_1k_words"]),
        semicolon_per_1k_words=float(stats["semicolon_per_1k_words"]),
        colon_per_1k_words=float(stats["colon_per_1k_words"]),
        question_per_1k_words=float(stats["question_per_1k_words"]),
        exclamation_per_1k_words=float(stats["exclamation_per_1k_words"]),
    )


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


@router.get("/stylistics/compare", response_model=StylisticsCompareResponse)
def compare_stylistics(
    work_id_a: int = Query(..., description="First work id"),
    work_id_b: int = Query(..., description="Second work id"),
    db: Session = Depends(get_db),
) -> StylisticsCompareResponse:
    """Same lite stylistics for two works (period / author shown for context; genre not modeled)."""
    wa = db.get(Work, work_id_a)
    wb = db.get(Work, work_id_b)
    if wa is None or wb is None:
        raise HTTPException(status_code=404, detail="One or both works not found")
    period_map = {p.id: p.name for p in db.execute(select(Period)).scalars().all()}

    def meta(w: Work) -> WorkStylisticsMeta:
        return WorkStylisticsMeta(
            work_id=w.id,
            title=w.title,
            author=w.author,
            year=w.year,
            period_name=period_map.get(w.period_id) if w.period_id else None,
        )

    sa = stylistics_lite(wa.content)
    sb = stylistics_lite(wb.content)
    return StylisticsCompareResponse(
        work_a=_stylistics_lite_response(wa, sa),
        work_b=_stylistics_lite_response(wb, sb),
        meta_a=meta(wa),
        meta_b=meta(wb),
    )


@router.get("/{work_id}/stylistics-rolling", response_model=StylisticsRollingResponse)
def work_stylistics_rolling(
    work_id: int,
    window_words: int = Query(500, ge=50, le=5000),
    stride_words: int = Query(250, ge=1, le=5000),
    sentence_smooth: int = Query(5, ge=1, le=101),
    max_windows: int = Query(400, ge=10, le=2000),
    db: Session = Depends(get_db),
) -> StylisticsRollingResponse:
    """Rolling word-window TTR and smoothed sentence-length series (teaching / exploration)."""
    w = db.get(Work, work_id)
    if w is None:
        raise HTTPException(status_code=404, detail="Work not found")
    period_name = None
    if w.period_id:
        p = db.get(Period, w.period_id)
        period_name = p.name if p else None

    raw_windows, truncated = rolling_word_windows(
        w.content,
        window_words=window_words,
        stride_words=stride_words,
        max_windows=max_windows,
    )

    word_windows = [RollingWordWindowPoint.model_validate(row) for row in raw_windows]
    sent_raw = rolling_sentence_word_lengths(w.content, smooth=sentence_smooth)
    sentence_series = [RollingSentencePoint.model_validate(row) for row in sent_raw]

    return StylisticsRollingResponse(
        work_id=w.id,
        title=w.title,
        author=w.author,
        year=w.year,
        period_name=period_name,
        window_words=window_words,
        stride_words=stride_words,
        sentence_smooth=sentence_smooth,
        word_windows=word_windows,
        sentence_series=sentence_series,
        word_windows_truncated=truncated,
        total_word_tokens=word_token_count(w.content),
        total_sentences=len(sent_raw),
    )


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
    """Observational prose-oriented stats (word + punctuation heuristics); not tuned for verse."""
    w = db.get(Work, work_id)
    if w is None:
        raise HTTPException(status_code=404, detail="Work not found")
    stats = stylistics_lite(w.content)
    return _stylistics_lite_response(w, stats)

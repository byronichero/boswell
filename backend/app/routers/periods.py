"""Literary periods and scope metadata."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.period import PeriodRead, ScopeInfo
from app.services.scope import resolve_scope_period_ids

router = APIRouter()


@router.get("", response_model=list[PeriodRead])
def list_periods(db: Session = Depends(get_db)) -> list[PeriodRead]:
    """List all periods (for filters)."""
    from sqlalchemy import select

    from app.models.period import Period

    rows = db.execute(select(Period).order_by(Period.start_year.asc())).scalars().all()
    return [PeriodRead.model_validate(r) for r in rows]


@router.get("/scope", response_model=ScopeInfo)
def describe_scope(
    period_id: int | None = Query(None),
    soft: bool = Query(True),
    db: Session = Depends(get_db),
) -> ScopeInfo:
    """Explain which periods are included under soft scoping."""
    from app.config import get_settings

    settings = get_settings()
    pids, names = resolve_scope_period_ids(
        db,
        center_period_id=period_id,
        soft=soft,
        neighbor_count=settings.soft_scope_neighbor_periods,
    )
    return ScopeInfo(
        mode="soft" if soft else "hard",
        center_period_id=period_id,
        included_period_ids=pids,
        included_period_names=names,
    )

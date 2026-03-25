"""Period soft scoping (neighbor periods by table order)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.period import Period


def ordered_period_ids(db: Session) -> list[int]:
    """Return period primary keys sorted by start_year."""
    rows = db.execute(select(Period).order_by(Period.start_year.asc())).scalars().all()
    return [r.id for r in rows]


def resolve_scope_period_ids(
    db: Session,
    *,
    center_period_id: int | None,
    soft: bool,
    neighbor_count: int,
) -> tuple[list[int], list[str]]:
    """
    Return included period ids and names for filtering.

    If center_period_id is None, all periods are included.
    If soft is True, include neighbor periods within neighbor_count on each side.
    """
    periods = db.execute(select(Period).order_by(Period.start_year.asc())).scalars().all()
    if not periods:
        return [], []
    ids_order = [p.id for p in periods]
    name_by_id = {p.id: p.name for p in periods}

    if center_period_id is None:
        return ids_order, [name_by_id[i] for i in ids_order]

    if center_period_id not in ids_order:
        return ids_order, [name_by_id[i] for i in ids_order]

    idx = ids_order.index(center_period_id)
    if not soft or neighbor_count <= 0:
        return [center_period_id], [name_by_id[center_period_id]]

    lo = max(0, idx - neighbor_count)
    hi = min(len(ids_order), idx + neighbor_count + 1)
    scoped = ids_order[lo:hi]
    return scoped, [name_by_id[i] for i in scoped]


def work_ids_for_periods_sql(db: Session, period_ids: list[int]) -> list[int]:
    """Work ids whose period_id is in the given list (or all works if empty filter means 'any')."""
    from app.models.work import Work

    if not period_ids:
        rows = db.execute(select(Work.id)).scalars().all()
        return list(rows)
    rows = db.execute(select(Work.id).where(Work.period_id.in_(period_ids))).scalars().all()
    return list(rows)

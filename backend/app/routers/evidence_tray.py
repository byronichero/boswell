"""Evidence tray CRUD."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models.evidence_tray import EvidenceTray, TrayItem
from app.models.work import Work
from app.schemas.tray import (
    TrayItemCreate,
    TrayItemPatch,
    TrayItemRead,
    TrayRead,
    TrayReorderBody,
)

router = APIRouter()


def _item_to_read(db: Session, it: TrayItem) -> TrayItemRead:
    w = db.get(Work, it.work_id)
    period_name = None
    if w and w.period_id:
        from app.models.period import Period

        p = db.get(Period, w.period_id)
        period_name = p.name if p else None
    return TrayItemRead(
        tray_item_id=it.id,
        work_id=it.work_id,
        work_title=w.title if w else "",
        author=w.author if w else "",
        period_name=period_name,
        locator=it.locator,
        excerpt=it.excerpt,
        note=it.note,
        sort_order=it.sort_order,
    )


@router.post("", response_model=TrayRead)
def create_tray(db: Session = Depends(get_db)) -> TrayRead:
    """Create an empty tray."""
    t = EvidenceTray()
    db.add(t)
    db.commit()
    db.refresh(t)
    return TrayRead(tray_id=t.id, label=t.label, items=[])


@router.get("/{tray_id}", response_model=TrayRead)
def get_tray(tray_id: uuid.UUID, db: Session = Depends(get_db)) -> TrayRead:
    """List tray contents."""
    t = db.get(EvidenceTray, tray_id)
    if t is None:
        raise HTTPException(status_code=404, detail="Tray not found")
    items = db.scalars(
        select(TrayItem).where(TrayItem.tray_id == tray_id).order_by(TrayItem.sort_order.asc())
    ).all()
    return TrayRead(
        tray_id=t.id,
        label=t.label,
        items=[_item_to_read(db, it) for it in items],
    )


@router.post("/{tray_id}/items", response_model=TrayItemRead)
def add_item(
    tray_id: uuid.UUID,
    body: TrayItemCreate,
    db: Session = Depends(get_db),
) -> TrayItemRead:
    """Append an excerpt to the tray."""
    settings = get_settings()
    t = db.get(EvidenceTray, tray_id)
    if t is None:
        raise HTTPException(status_code=404, detail="Tray not found")
    w = db.get(Work, body.work_id)
    if w is None:
        raise HTTPException(status_code=400, detail="Invalid work_id")
    count = db.scalar(select(func.count()).select_from(TrayItem).where(TrayItem.tray_id == tray_id))
    if count is not None and int(count) >= settings.max_tray_items:
        raise HTTPException(status_code=400, detail="Tray item limit reached")
    max_ord = db.scalar(
        select(func.coalesce(func.max(TrayItem.sort_order), -1))
        .select_from(TrayItem)
        .where(TrayItem.tray_id == tray_id)
    )
    it = TrayItem(
        tray_id=tray_id,
        work_id=body.work_id,
        locator=body.locator,
        excerpt=body.excerpt,
        note=body.note,
        sort_order=int(max_ord) + 1,
    )
    db.add(it)
    db.commit()
    db.refresh(it)
    return _item_to_read(db, it)


@router.patch("/{tray_id}/items/{item_id}", response_model=TrayItemRead)
def patch_item(
    tray_id: uuid.UUID,
    item_id: uuid.UUID,
    body: TrayItemPatch,
    db: Session = Depends(get_db),
) -> TrayItemRead:
    """Update note or excerpt."""
    it = db.get(TrayItem, item_id)
    if it is None or it.tray_id != tray_id:
        raise HTTPException(status_code=404, detail="Item not found")
    if body.note is not None:
        it.note = body.note
    if body.excerpt is not None:
        it.excerpt = body.excerpt
    db.commit()
    db.refresh(it)
    return _item_to_read(db, it)


@router.delete("/{tray_id}/items/{item_id}", status_code=204)
def delete_item(tray_id: uuid.UUID, item_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    """Remove one item."""
    it = db.get(TrayItem, item_id)
    if it is None or it.tray_id != tray_id:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(it)
    db.commit()


@router.post("/{tray_id}/reorder", response_model=TrayRead)
def reorder(tray_id: uuid.UUID, body: TrayReorderBody, db: Session = Depends(get_db)) -> TrayRead:
    """Set item order."""
    t = db.get(EvidenceTray, tray_id)
    if t is None:
        raise HTTPException(status_code=404, detail="Tray not found")
    items = db.scalars(select(TrayItem).where(TrayItem.tray_id == tray_id)).all()
    by_id = {i.id: i for i in items}
    for order, uid in enumerate(body.item_ids):
        row = by_id.get(uid)
        if row is not None:
            row.sort_order = order
    db.commit()
    items = db.scalars(
        select(TrayItem).where(TrayItem.tray_id == tray_id).order_by(TrayItem.sort_order.asc())
    ).all()
    return TrayRead(
        tray_id=t.id,
        label=t.label,
        items=[_item_to_read(db, it) for it in items],
    )

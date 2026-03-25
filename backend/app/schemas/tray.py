"""Evidence tray schemas."""

import uuid

from pydantic import BaseModel, ConfigDict, Field


class TrayItemCreate(BaseModel):
    """Add an excerpt to the tray."""

    work_id: int
    locator: str = ""
    excerpt: str = Field(..., min_length=1)
    note: str | None = None


class TrayItemRead(BaseModel):
    """Tray item with stable id for citations."""

    model_config = ConfigDict(from_attributes=True)

    tray_item_id: uuid.UUID
    work_id: int
    work_title: str = ""
    author: str = ""
    period_name: str | None = None
    locator: str
    excerpt: str
    note: str | None
    sort_order: int


class TrayRead(BaseModel):
    """Tray with ordered items."""

    tray_id: uuid.UUID
    label: str | None
    items: list[TrayItemRead]


class TrayReorderBody(BaseModel):
    """Ordered list of item ids."""

    item_ids: list[uuid.UUID]


class TrayItemPatch(BaseModel):
    """Update note or text fields."""

    note: str | None = None
    excerpt: str | None = None

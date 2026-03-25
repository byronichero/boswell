"""Work schemas."""

from pydantic import BaseModel, ConfigDict


class WorkListItem(BaseModel):
    """Summary row for browse."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    author: str
    year: int | None
    period_id: int | None
    period_name: str | None = None


class WorkRead(BaseModel):
    """Full work payload including text (large)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    author: str
    year: int | None
    content: str
    period_id: int | None
    period_name: str | None = None

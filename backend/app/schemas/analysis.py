"""Analysis / synthesis schemas."""

import uuid

from pydantic import BaseModel, Field


class SynthesizeRequest(BaseModel):
    """Grounded synthesis from tray + optional instruction."""

    tray_id: uuid.UUID
    question: str = Field(..., min_length=1)
    period_id: int | None = None
    soft_scope: bool = True


class SynthesizeResponse(BaseModel):
    """Model output with optional persistence id."""

    content: str
    analysis_id: int | None = None
    tray_id: str | None = None

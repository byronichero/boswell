"""Analysis / synthesis schemas."""

import uuid

from pydantic import BaseModel, Field


class SynthesizeRequest(BaseModel):
    """Grounded synthesis from tray + optional instruction."""

    tray_id: uuid.UUID
    question: str = Field(..., min_length=1)
    period_id: int | None = None
    soft_scope: bool = True
    model: str | None = Field(
        default=None,
        description="Ollama chat model; defaults to OLLAMA_CHAT_MODEL when omitted.",
    )


class SynthesizeResponse(BaseModel):
    """Model output with optional persistence id."""

    content: str
    analysis_id: int | None = None
    tray_id: str | None = None

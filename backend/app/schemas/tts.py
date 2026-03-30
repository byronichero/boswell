"""TTS request/response schemas (proxy to Kokoro service)."""

from pydantic import BaseModel, Field


class TtsRequest(BaseModel):
    """Body for POST /api/tts — forwarded to the Kokoro container."""

    text: str = Field(..., min_length=1, max_length=50_000)
    voice: str = Field(default="af_heart", max_length=64)
    lang_code: str = Field(default="a", min_length=1, max_length=8)
    speed: float = Field(default=1.0, ge=0.5, le=2.0)

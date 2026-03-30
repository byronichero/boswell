"""TTS request/response schemas (proxy to Kokoro service)."""

from typing import Literal

from pydantic import BaseModel, Field


class TtsRequest(BaseModel):
    """Body for POST /api/tts — forwarded to the Kokoro container."""

    text: str = Field(..., min_length=1, max_length=50_000)
    # Kokoro: lang_code b = British English; bm_* = British male (hexgrad/Kokoro-82M VOICES.md).
    voice: str = Field(default="bm_george", max_length=64)
    lang_code: str = Field(default="b", min_length=1, max_length=8)
    preset: Literal["narration", "preview"] = Field(
        default="narration",
        description="Kokoro-only: narration (calmer) vs preview (faster playback).",
    )

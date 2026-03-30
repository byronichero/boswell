"""Minimal Kokoro TTS HTTP service (used by Boswell backend)."""

from __future__ import annotations

import logging
from io import BytesIO
from typing import Any

import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

SAMPLE_RATE = 24_000

_pipeline_cache: dict[str, Any] = {}

app = FastAPI(title="Kokoro TTS", version="1.0.0")


class TtsRequest(BaseModel):
    """Request body for speech synthesis."""

    text: str = Field(..., max_length=50_000, description="Plain text; newlines preserved for poetry.")
    voice: str = Field(default="af_heart", max_length=64)
    lang_code: str = Field(default="a", min_length=1, max_length=8, description="Kokoro language code, e.g. a=American English.")
    speed: float = Field(default=1.0, ge=0.5, le=2.0)


def _get_pipeline(lang_code: str) -> Any:
    """Return a cached KPipeline for the given language code."""
    if lang_code not in _pipeline_cache:
        from kokoro import KPipeline  # lazy import

        logger.info("Loading Kokoro pipeline for lang_code=%s", lang_code)
        _pipeline_cache[lang_code] = KPipeline(lang_code=lang_code)
    return _pipeline_cache[lang_code]


def _to_numpy(audio: object) -> np.ndarray:
    """Convert model output to 1-D float32 numpy array."""
    if hasattr(audio, "detach"):
        audio = audio.detach().cpu().numpy()
    arr = np.asarray(audio)
    if arr.ndim > 1:
        arr = np.squeeze(arr)
    return arr.astype(np.float32, copy=False)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe (does not load the model)."""
    return {"status": "ok", "service": "kokoro-tts"}


@app.post("/tts")
def synthesize(body: TtsRequest) -> Response:
    """Synthesize WAV audio (24 kHz mono) from text."""
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is empty")

    pipeline = _get_pipeline(body.lang_code)
    chunks: list[np.ndarray] = []
    generator = pipeline(
        text,
        voice=body.voice,
        speed=body.speed,
        split_pattern=r"\n+",
    )
    for _gs, _ps, audio in generator:
        chunks.append(_to_numpy(audio))

    if not chunks:
        raise HTTPException(status_code=500, detail="no audio generated")

    full = np.concatenate(chunks, axis=0) if len(chunks) > 1 else chunks[0]
    buf = BytesIO()
    sf.write(buf, full, SAMPLE_RATE, format="WAV", subtype="PCM_16")
    buf.seek(0)
    return Response(content=buf.read(), media_type="audio/wav")

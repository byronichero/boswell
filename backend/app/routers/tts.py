"""Text-to-speech via Kokoro (Docker service)."""

import logging

import httpx
from fastapi import APIRouter, HTTPException, Response

from app.config import get_settings
from app.schemas.tts import TtsRequest

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/tts")
async def synthesize_speech(body: TtsRequest) -> Response:
    """Proxy to the Kokoro TTS service; returns WAV (24 kHz)."""
    settings = get_settings()
    base = settings.kokoro_tts_url.rstrip("/")
    url = f"{base}/tts"
    timeout = httpx.Timeout(settings.kokoro_tts_timeout_s)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            upstream = await client.post(
                url,
                json=body.model_dump(),
                headers={"Content-Type": "application/json"},
            )
    except httpx.RequestError as e:
        logger.warning("Kokoro TTS unreachable: %s", e)
        raise HTTPException(
            status_code=503,
            detail="TTS service unavailable. Ensure the kokoro-tts container is running.",
        ) from e

    if upstream.status_code >= 400:
        detail = upstream.text
        try:
            err_json = upstream.json()
            if isinstance(err_json, dict) and "detail" in err_json:
                detail = str(err_json["detail"])
        except Exception:
            pass
        raise HTTPException(status_code=upstream.status_code, detail=detail)

    return Response(content=upstream.content, media_type="audio/wav")

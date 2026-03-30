"""Tests for TTS proxy router."""

from unittest.mock import AsyncMock, patch

import httpx
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


@patch("app.routers.tts.httpx.AsyncClient")
def test_tts_proxy_returns_wav(mock_async_client: AsyncMock) -> None:
    """POST /api/tts forwards to Kokoro and returns audio bytes."""
    mock_response = httpx.Response(200, content=b"RIFFxxxxWAV")
    mock_inner = AsyncMock()
    mock_inner.post = AsyncMock(return_value=mock_response)
    mock_cm = AsyncMock()
    mock_cm.__aenter__.return_value = mock_inner
    mock_cm.__aexit__.return_value = None
    mock_async_client.return_value = mock_cm

    r = client.post(
        "/api/tts",
        json={"text": "Hello world"},
    )
    assert r.status_code == 200
    assert r.content == b"RIFFxxxxWAV"
    assert r.headers.get("content-type", "").startswith("audio/wav")


def test_tts_validation_empty_body() -> None:
    """Missing text should fail validation."""
    r = client.post("/api/tts", json={})
    assert r.status_code == 422

"""HTTP client for Ollama embeddings and chat."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


async def embed_texts(texts: list[str], settings: Settings | None = None) -> list[list[float]]:
    """Return embedding vectors for each input string."""
    settings = settings or get_settings()
    url = f"{settings.ollama_host.rstrip('/')}/api/embeddings"
    out: list[list[float]] = []
    timeout = httpx.Timeout(settings.ollama_timeout_s)
    async with httpx.AsyncClient(timeout=timeout) as client:
        for t in texts:
            resp = await client.post(
                url,
                json={"model": settings.ollama_embed_model, "prompt": t},
            )
            resp.raise_for_status()
            data: dict[str, Any] = resp.json()
            emb = data.get("embedding")
            if not isinstance(emb, list):
                raise RuntimeError("Ollama embeddings response missing 'embedding' array")
            out.append([float(x) for x in emb])
    return out


async def chat_completion(
    system: str,
    user: str,
    *,
    settings: Settings | None = None,
) -> str:
    """Single-turn chat completion."""
    settings = settings or get_settings()
    url = f"{settings.ollama_host.rstrip('/')}/api/chat"
    payload = {
        "model": settings.ollama_chat_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "stream": False,
    }
    timeout = httpx.Timeout(settings.ollama_timeout_s)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        msg = data.get("message") or {}
        content = msg.get("content")
        if not isinstance(content, str):
            raise RuntimeError("Unexpected Ollama chat response shape")
        return content

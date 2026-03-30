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


async def list_ollama_models(settings: Settings | None = None) -> list[str]:
    """Return installed Ollama model names from ``/api/tags`` (sorted)."""
    settings = settings or get_settings()
    url = f"{settings.ollama_host.rstrip('/')}/api/tags"
    timeout = httpx.Timeout(min(30.0, settings.ollama_timeout_s))
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data: dict[str, Any] = resp.json()
    raw = data.get("models")
    if not isinstance(raw, list):
        return []
    names: list[str] = []
    for item in raw:
        if isinstance(item, dict):
            name = item.get("name")
            if isinstance(name, str) and name:
                names.append(name)
    return sorted(names)


async def chat_completion(
    system: str,
    user: str,
    *,
    model: str | None = None,
    settings: Settings | None = None,
) -> str:
    """Single-turn chat completion."""
    settings = settings or get_settings()
    url = f"{settings.ollama_host.rstrip('/')}/api/chat"
    payload = {
        "model": model or settings.ollama_chat_model,
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


async def chat_open_completion(
    messages: list[dict[str, str]],
    *,
    system: str,
    model: str | None = None,
    settings: Settings | None = None,
) -> str:
    """Multi-turn chat; ``messages`` are user/assistant turns (no system)."""
    settings = settings or get_settings()
    url = f"{settings.ollama_host.rstrip('/')}/api/chat"
    ollama_messages: list[dict[str, str]] = [{"role": "system", "content": system}]
    ollama_messages.extend(messages)
    payload = {
        "model": model or settings.ollama_chat_model,
        "messages": ollama_messages,
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

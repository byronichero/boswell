"""Ollama listing helpers for the UI."""

from fastapi import APIRouter, HTTPException

from app.schemas.ollama_tools import OllamaModelsResponse
from app.services.ollama_client import list_ollama_models

router = APIRouter()


@router.get(
    "/models",
    response_model=OllamaModelsResponse,
    responses={502: {"description": "Cannot reach Ollama"}},
)
async def get_models() -> OllamaModelsResponse:
    """Return installed Ollama model names (from ``/api/tags``)."""
    try:
        names = await list_ollama_models()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama unavailable: {e!s}") from e
    return OllamaModelsResponse(models=names)

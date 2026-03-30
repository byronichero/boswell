"""Ollama helper API schemas."""

from pydantic import BaseModel, Field


class OllamaModelsResponse(BaseModel):
    """List of installed Ollama model names."""

    models: list[str] = Field(default_factory=list)

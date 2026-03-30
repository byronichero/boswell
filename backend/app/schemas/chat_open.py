"""Open (ungrounded) chat API schemas."""

from typing import Literal

from pydantic import BaseModel, Field


class ChatOpenMessage(BaseModel):
    """A single turn in the open chat history."""

    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=120_000)


class ChatOpenRequest(BaseModel):
    """Multi-turn open chat; last message must be from the user."""

    messages: list[ChatOpenMessage] = Field(..., min_length=1, max_length=50)
    model: str | None = Field(
        default=None,
        description="Ollama chat model name; defaults to OLLAMA_CHAT_MODEL when omitted.",
    )


class ChatOpenResponse(BaseModel):
    """Assistant reply for open chat."""

    message: str

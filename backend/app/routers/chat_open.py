"""Open (ungrounded) conversational chat via Ollama."""

from fastapi import APIRouter, HTTPException

from app.schemas.chat_open import ChatOpenRequest, ChatOpenResponse
from app.services.ollama_client import chat_open_completion

router = APIRouter()

_OPEN_CHAT_SYSTEM = (
    "You are Boswell, a knowledgeable companion for English literature and close reading. "
    "Answer conversationally and helpfully. This mode is general chat—not constrained to a "
    "curated evidence tray. When discussing specific passages or interpretations, encourage "
    "readers to verify against primary texts. Be concise but warm."
)


@router.post(
    "/open",
    response_model=ChatOpenResponse,
    responses={
        422: {"description": "Invalid message history"},
        502: {"description": "Ollama or chat model unavailable"},
    },
)
async def open_chat(body: ChatOpenRequest) -> ChatOpenResponse:
    """
    Multi-turn open chat (not evidence-tray grounded).

    Expects alternating user/assistant history ending with a user message.
    """
    msgs = body.messages
    if msgs[-1].role != "user":
        raise HTTPException(
            status_code=422,
            detail="Last message must be from the user",
        )
    for i, m in enumerate(msgs):
        expected = "user" if i % 2 == 0 else "assistant"
        if m.role != expected:
            raise HTTPException(
                status_code=422,
                detail="Messages must alternate user/assistant starting with user",
            )
    try:
        ollama_messages = [{"role": m.role, "content": m.content} for m in msgs]
        content = await chat_open_completion(
            ollama_messages,
            system=_OPEN_CHAT_SYSTEM,
            model=body.model,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Chat model error: {e!s}") from e
    return ChatOpenResponse(message=content)

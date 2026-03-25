"""Health and dependency checks."""

import httpx
from fastapi import APIRouter

from app.config import get_settings
from app.services.neo4j_sync import get_driver
from app.services.qdrant_chunks import ensure_collection

router = APIRouter()


@router.get("")
def health() -> dict[str, str | dict[str, str]]:
    """Liveness probe."""
    return {"status": "ok", "service": "boswell"}


@router.get("/ready")
async def ready() -> dict[str, object]:
    """Check optional dependencies (best-effort)."""
    settings = get_settings()
    deps: dict[str, str] = {}
    # Postgres assumed OK if we got here
    deps["postgres"] = "ok"
    try:
        ensure_collection()
        deps["qdrant"] = "ok"
    except Exception as e:
        deps["qdrant"] = f"error: {e!s}"
    try:
        driver = get_driver()
        driver.verify_connectivity()
        deps["neo4j"] = "ok"
    except Exception as e:
        deps["neo4j"] = f"error: {e!s}"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{settings.ollama_host.rstrip('/')}/api/tags")
            r.raise_for_status()
            deps["ollama"] = "ok"
    except Exception as e:
        deps["ollama"] = f"error: {e!s}"
    return {"status": "ready", "dependencies": deps}

"""FastAPI entrypoint."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import cors_origins_list, get_settings
from app.db import Base, engine
from app.routers import analysis, documents, evidence_tray, health, periods, search, works
from app.services.bootstrap import run_startup_bootstrap


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Create tables on startup."""
    import app.models  # noqa: F401 — register models for metadata

    Base.metadata.create_all(bind=engine)
    bootstrap_task = asyncio.create_task(run_startup_bootstrap())
    application.state.bootstrap_task = bootstrap_task
    yield
    bootstrap_task = getattr(application.state, "bootstrap_task", None)
    if bootstrap_task is not None and not bootstrap_task.done():
        bootstrap_task.cancel()


app = FastAPI(title="Boswell API", lifespan=lifespan)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins_list(settings),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(works.router, prefix="/api/works", tags=["works"])
app.include_router(periods.router, prefix="/api/periods", tags=["periods"])
app.include_router(evidence_tray.router, prefix="/api/evidence-tray", tags=["evidence-tray"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])


@app.get("/")
def root() -> dict[str, str]:
    """Service root."""
    return {"name": "boswell", "docs": "/docs"}

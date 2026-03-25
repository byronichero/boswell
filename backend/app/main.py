"""FastAPI entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import cors_origins_list, get_settings
from app.db import Base, engine
from app.routers import analysis, evidence_tray, health, periods, search, works


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup."""
    import app.models  # noqa: F401 — register models for metadata

    Base.metadata.create_all(bind=engine)
    yield


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
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])


@app.get("/")
def root() -> dict[str, str]:
    """Service root."""
    return {"name": "boswell", "docs": "/docs"}

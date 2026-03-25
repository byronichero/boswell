#!/usr/bin/env python3
"""Seed literary periods, ingest bundled sample text, index Qdrant, sync Neo4j.

Run inside the backend container:

    docker compose exec backend python /app/scripts/init_data.py

``--force`` drops relational tables and the Qdrant collection (development only).
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import get_settings  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.models import Period, Work  # noqa: E402
from app.services.chunking import chunk_text  # noqa: E402
from app.services.neo4j_sync import sync_from_postgres  # noqa: E402
from app.services.ollama_client import embed_texts  # noqa: E402
from app.services.qdrant_chunks import ensure_collection, upsert_chunks  # noqa: E402
from sqlalchemy import select  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("init_data")

PERIODS: list[tuple[int, str, int, int]] = [
    (1, "Old English", 450, 1100),
    (2, "Middle English", 1100, 1470),
    (3, "Early Modern", 1470, 1700),
    (4, "Late Modern (18th century)", 1700, 1800),
    (5, "Romantic / Victorian (transition)", 1780, 1837),
    (6, "Victorian", 1837, 1901),
    (7, "Edwardian & Pre-War", 1899, 1914),
    (8, "Modernism", 1914, 1945),
    (9, "Post-War & Contemporary", 1945, 2030),
]


def _sample_path() -> Path:
    p = Path("/app/docs/gutenberg/shakespeare-sonnet-18.txt")
    if p.is_file():
        return p
    return ROOT / "docs/gutenberg/shakespeare-sonnet-18.txt"


def _reset_qdrant_collection() -> None:
    from qdrant_client import QdrantClient

    settings = get_settings()
    c = QdrantClient(url=settings.qdrant_url, prefer_grpc=False)
    try:
        c.delete_collection(collection_name=settings.qdrant_collection)
        logger.info("Deleted Qdrant collection %s", settings.qdrant_collection)
    except Exception as e:
        logger.warning("Qdrant delete (ok if missing): %s", e)


async def _ingest_work(db, work: Work) -> None:
    settings = get_settings()
    chunks = chunk_text(work.content, settings.chunk_size, settings.chunk_overlap)
    if not chunks:
        return
    texts = [c[1] for c in chunks]
    try:
        vectors = await embed_texts(texts)
    except Exception:
        logger.exception("Embedding failed; skip Qdrant for this work")
        return
    upsert_chunks(work.id, work.title, chunks, vectors, settings=settings)
    logger.info("Indexed %s chunks for work id=%s", len(chunks), work.id)


async def async_main() -> None:
    parser = argparse.ArgumentParser(description="Boswell data initialization")
    parser.add_argument("--force", action="store_true", help="Drop DB tables + Qdrant collection")
    parser.add_argument("--skip-neo4j", action="store_true", help="Skip Neo4j sync")
    parser.add_argument("--skip-qdrant", action="store_true", help="Skip embeddings / Qdrant")
    args = parser.parse_args()

    import app.models  # noqa: F401

    if args.force:
        logger.warning("Dropping all tables (dev)")
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    if args.force:
        _reset_qdrant_collection()

    ensure_collection()

    sample = _sample_path()
    if not sample.is_file():
        logger.error("Sample file missing: %s", sample)
        sys.exit(1)
    text = sample.read_text(encoding="utf-8", errors="replace")

    db = SessionLocal()
    try:
        if db.scalars(select(Period).limit(1)).first() is None:
            for pid, name, sy, ey in PERIODS:
                db.add(Period(id=pid, name=name, start_year=sy, end_year=ey))
            db.commit()
            logger.info("Seeded %s periods", len(PERIODS))

        work = db.execute(select(Work).where(Work.title == "Sonnet 18")).scalars().first()
        if work is None:
            work = Work(
                title="Sonnet 18",
                author="William Shakespeare",
                year=1609,
                content=text,
                period_id=3,
            )
            db.add(work)
            db.commit()
            db.refresh(work)
            logger.info("Inserted work id=%s from %s", work.id, sample)
        if not args.skip_qdrant:
            await _ingest_work(db, work)

        if not args.skip_neo4j:
            try:
                sync_from_postgres(db)
                logger.info("Neo4j graph synced")
            except Exception:
                logger.exception("Neo4j sync failed (graph may be empty)")
    finally:
        db.close()


def main() -> None:
    asyncio.run(async_main())


if __name__ == "__main__":
    main()

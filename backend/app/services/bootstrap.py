"""Application bootstrap utilities for first-run data seeding."""

from __future__ import annotations

import logging
import re
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import SessionLocal
from app.models import Period, Work
from app.services.chunking import chunk_text
from app.services.neo4j_sync import sync_from_postgres
from app.services.ollama_client import embed_texts
from app.services.qdrant_chunks import ensure_collection, upsert_chunks

logger = logging.getLogger(__name__)

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

_TIER_B_BLOCK_RE = re.compile(
    r"^tier_b_download:\s*$\n(?P<body>.*?)(?=^\w|\Z)",
    re.MULTILINE | re.DOTALL,
)
_ENTRY_RE = re.compile(r"^\s*-\s+gutenberg_id:\s*(\d+)\s*$", re.MULTILINE)
_FIELD_RE = re.compile(r"^\s{4}([a-z_]+):\s*(.+?)\s*$", re.MULTILINE)


def _sample_path() -> Path:
    candidate = Path("/app/docs/gutenberg/shakespeare-sonnet-18.txt")
    if candidate.is_file():
        return candidate
    root = Path(__file__).resolve().parents[3]
    return root / "docs/gutenberg/shakespeare-sonnet-18.txt"


def _manifest_path() -> Path:
    candidate = Path("/app/docs/corpus-manifest.yaml")
    if candidate.is_file():
        return candidate
    root = Path(__file__).resolve().parents[3]
    return root / "docs/corpus-manifest.yaml"


def _try_urls(gutenberg_id: int) -> list[str]:
    gid = gutenberg_id
    return [
        f"https://www.gutenberg.org/cache/epub/{gid}/pg{gid}.txt",
        f"https://www.gutenberg.org/files/{gid}/{gid}-0.txt",
        f"https://www.gutenberg.org/files/{gid}/{gid}.txt",
    ]


def _download_gutenberg_text(gutenberg_id: int, timeout_s: int) -> str:
    last_err: Exception | None = None
    for url in _try_urls(gutenberg_id):
        req = Request(url, headers={"User-Agent": "BoswellStartupBootstrap/1.0"})
        try:
            with urlopen(req, timeout=timeout_s) as resp:
                data = resp.read()
            return data.decode("utf-8", errors="replace")
        except (URLError, TimeoutError) as err:
            last_err = err
            continue
    raise RuntimeError(f"Failed to download Gutenberg ID {gutenberg_id}: {last_err!s}")


def _strip_quotes(value: str) -> str:
    value = value.strip()
    if value.startswith('"') and value.endswith('"'):
        return value[1:-1]
    return value


def _parse_tier_b_manifest_entries(manifest_text: str) -> list[dict[str, str]]:
    match = _TIER_B_BLOCK_RE.search(manifest_text)
    if match is None:
        return []
    body = match.group("body")
    starts = list(_ENTRY_RE.finditer(body))
    entries: list[dict[str, str]] = []
    for index, entry_start in enumerate(starts):
        start_pos = entry_start.start()
        end_pos = starts[index + 1].start() if index + 1 < len(starts) else len(body)
        block = body[start_pos:end_pos]
        entry: dict[str, str] = {"gutenberg_id": entry_start.group(1)}
        for field_match in _FIELD_RE.finditer(block):
            key = field_match.group(1)
            value = _strip_quotes(field_match.group(2))
            entry[key] = value
        entries.append(entry)
    return entries


def _period_id_from_hint(db: Session, hint: str | None) -> int | None:
    if not hint:
        return None
    normalized = hint.lower()
    candidates = db.execute(select(Period).order_by(Period.start_year.asc())).scalars().all()
    for period in candidates:
        pname = period.name.lower()
        if pname in normalized or normalized in pname:
            return period.id
    keyword_map = {
        "old english": 1,
        "middle english": 2,
        "early modern": 3,
        "late modern": 4,
        "romantic": 5,
        "victorian": 6,
        "edwardian": 7,
        "modernism": 8,
        "post-war": 9,
        "contemporary": 9,
    }
    for key, period_id in keyword_map.items():
        if key in normalized:
            return period_id
    return None


def ensure_periods_seeded(db: Session) -> None:
    """Insert default period rows if table is empty."""
    has_periods = db.scalars(select(Period).limit(1)).first() is not None
    if has_periods:
        return
    for period_id, name, start_year, end_year in PERIODS:
        db.add(Period(id=period_id, name=name, start_year=start_year, end_year=end_year))
    db.commit()
    logger.info("Seeded %s literary periods", len(PERIODS))


def ensure_sample_work_seeded(db: Session) -> Work | None:
    """Insert Sonnet 18 sample work if absent."""
    existing = db.scalars(select(Work).where(Work.title == "Sonnet 18")).first()
    if existing is not None:
        return None

    sample = _sample_path()
    if not sample.is_file():
        logger.warning("Sample text missing; skipping sample work seed: %s", sample)
        return None

    text = sample.read_text(encoding="utf-8", errors="replace")
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
    logger.info("Seeded sample work id=%s from %s", work.id, sample)
    return work


async def _index_work(work: Work, settings: Settings) -> None:
    """Index a single work into Qdrant (best effort)."""
    chunks = chunk_text(work.content, settings.chunk_size, settings.chunk_overlap)
    if not chunks:
        return
    texts = [chunk_text_value for _, chunk_text_value in chunks]
    vectors = await embed_texts(texts, settings=settings)
    upsert_chunks(work.id, work.title, chunks, vectors, settings=settings)
    logger.info("Indexed sample work (%s chunks)", len(chunks))


async def _seed_manifest_tier_b(db: Session, settings: Settings) -> int:
    if not settings.auto_seed_manifest_tier_b:
        return 0

    manifest_path = _manifest_path()
    if not manifest_path.is_file():
        logger.warning("Manifest missing; skipping Tier B bootstrap: %s", manifest_path)
        return 0

    manifest_text = manifest_path.read_text(encoding="utf-8", errors="replace")
    entries = _parse_tier_b_manifest_entries(manifest_text)
    if not entries:
        logger.warning("No tier_b_download entries found in manifest")
        return 0

    try:
        ensure_collection(settings=settings)
    except Exception:
        logger.exception("Manifest bootstrap skipped because Qdrant is unavailable")
        return 0
    inserted = 0
    for entry in entries:
        title = entry.get("title", "").strip()
        author = entry.get("author", "").strip() or "Unknown"
        if not title:
            continue
        existing = db.scalars(
            select(Work).where(Work.title == title, Work.author == author)
        ).first()
        if existing is not None:
            continue

        gid_raw = entry.get("gutenberg_id")
        if gid_raw is None:
            continue
        gid = int(gid_raw)

        try:
            text = _download_gutenberg_text(gid, settings.auto_seed_manifest_download_timeout_s)
        except Exception:
            logger.exception("Manifest bootstrap download failed for Gutenberg ID %s", gid)
            continue

        period_id = _period_id_from_hint(db, entry.get("period_hint"))
        work = Work(
            title=title,
            author=author,
            year=None,
            content=text,
            period_id=period_id,
        )
        db.add(work)
        db.commit()
        db.refresh(work)
        inserted += 1

        if settings.auto_seed_index_sample:
            try:
                await _index_work(work, settings)
            except Exception:
                logger.exception("Manifest bootstrap indexing failed for %s", title)
    if inserted > 0:
        logger.info("Manifest bootstrap inserted %s new works from Tier B", inserted)
    return inserted


async def run_startup_bootstrap(*, settings: Settings | None = None) -> None:
    """
    Seed minimal startup data for non-technical users.

    This is idempotent and safe to run on every startup.
    """
    cfg = settings or get_settings()
    if not cfg.auto_seed_on_startup:
        logger.info("Startup bootstrap disabled via AUTO_SEED_ON_STARTUP=false")
        return

    db = SessionLocal()
    try:
        try:
            ensure_periods_seeded(db)
            seeded_work = ensure_sample_work_seeded(db)

            if cfg.auto_seed_index_sample and seeded_work is not None:
                try:
                    ensure_collection(settings=cfg)
                    await _index_work(seeded_work, cfg)
                except Exception:
                    logger.exception("Sample indexing failed during startup bootstrap")

            try:
                await _seed_manifest_tier_b(db, cfg)
            except Exception:
                logger.exception("Manifest Tier B bootstrap failed")

            if cfg.auto_seed_sync_neo4j:
                try:
                    sync_from_postgres(db, settings=cfg)
                except Exception:
                    logger.exception("Neo4j sync failed during startup bootstrap")
        except Exception:
            logger.exception("Startup bootstrap failed; continuing app startup")
    finally:
        db.close()


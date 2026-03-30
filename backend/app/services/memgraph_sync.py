"""Memgraph graph: Period–Work relationships for scoped retrieval.

Uses the official ``neo4j`` Bolt driver (compatible with Memgraph's Bolt endpoint).
"""

from __future__ import annotations

import logging

from neo4j import Driver, GraphDatabase
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.models.period import Period
from app.models.work import Work

logger = logging.getLogger(__name__)

_driver: Driver | None = None


def _driver_auth(settings: Settings) -> tuple[str, str] | None:
    """Return Bolt auth tuple, or None when Memgraph runs without credentials."""
    if not settings.memgraph_user and not settings.memgraph_password:
        return None
    return (settings.memgraph_user, settings.memgraph_password)


def get_driver(settings: Settings | None = None) -> Driver:
    """Singleton Bolt driver (Memgraph)."""
    global _driver
    settings = settings or get_settings()
    if _driver is None:
        auth = _driver_auth(settings)
        _driver = GraphDatabase.driver(settings.memgraph_uri, auth=auth)
    return _driver


def close_driver() -> None:
    """Close Bolt driver (tests / shutdown)."""
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None


def sync_from_postgres(db: Session, settings: Settings | None = None) -> None:
    """Rebuild Work–Period graph from relational data."""
    settings = settings or get_settings()
    driver = get_driver(settings)
    works = db.execute(select(Work)).scalars().all()
    periods = {p.id: p for p in db.execute(select(Period)).scalars().all()}

    def write_tx(tx) -> None:
        tx.run("MATCH (n) DETACH DELETE n")

    def merge_tx(tx, w: Work) -> None:
        p = periods.get(w.period_id) if w.period_id is not None else None
        if p is None:
            pid = 0
            pname = "Unassigned"
            psy, pey = 0, 2100
        else:
            pid = p.id
            pname = p.name
            psy, pey = p.start_year, p.end_year
        tx.run(
            """
            MERGE (per:Period {id: $pid})
            SET per.name = $pname, per.start_year = $psy, per.end_year = $pey
            MERGE (work:Work {id: $wid})
            SET work.title = $title, work.author = $author, work.year = $year
            MERGE (work)-[:IN_PERIOD]->(per)
            """,
            wid=w.id,
            title=w.title,
            author=w.author,
            year=w.year,
            pid=pid,
            pname=pname,
            psy=psy,
            pey=pey,
        )

    try:
        with driver.session() as session:
            session.execute_write(write_tx)
            for w in works:
                session.execute_write(lambda tx, ww=w: merge_tx(tx, ww))
    except Exception:
        logger.exception("Memgraph sync failed")
        raise


def work_ids_for_periods(period_ids: list[int], settings: Settings | None = None) -> list[int]:
    """Return work ids linked to any of the given periods."""
    if not period_ids:
        return []
    settings = settings or get_settings()
    driver = get_driver(settings)
    q = """
    MATCH (w:Work)-[:IN_PERIOD]->(p:Period)
    WHERE p.id IN $pids
    RETURN DISTINCT w.id AS id
    """
    with driver.session() as session:
        rows = session.run(q, pids=period_ids)
        return [int(r["id"]) for r in rows]

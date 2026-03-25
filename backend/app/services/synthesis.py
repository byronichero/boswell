"""Build prompts and run synthesis over the evidence tray."""

from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.models.analysis import Analysis
from app.models.evidence_tray import EvidenceTray, TrayItem
from app.models.work import Work
from app.services.ollama_client import chat_completion

logger = logging.getLogger(__name__)


async def synthesize_from_tray(
    db: Session,
    *,
    tray_id: uuid.UUID,
    question: str,
    settings: Settings | None = None,
) -> tuple[str, int | None]:
    """
    Produce analysis citing tray items as [T1], [T2], ... by sort order.

    Returns:
        (markdown_or_plain_text, saved_analysis_id or None)
    """
    settings = settings or get_settings()
    tray = db.get(EvidenceTray, tray_id)
    if tray is None:
        raise ValueError("Tray not found")
    items = list(
        db.scalars(
            select(TrayItem)
            .where(TrayItem.tray_id == tray_id)
            .order_by(TrayItem.sort_order.asc(), TrayItem.id.asc())
        ).all()
    )
    if not items:
        raise ValueError("Evidence tray is empty")

    total_chars = sum(len(i.excerpt) for i in items)
    if total_chars > settings.max_tray_excerpt_chars:
        raise ValueError("Total excerpt length exceeds configured maximum")

    work_ids = {i.work_id for i in items}
    works = {
        w.id: w
        for w in db.scalars(select(Work).where(Work.id.in_(work_ids))).all()
    }

    lines: list[str] = []
    for n, it in enumerate(items, start=1):
        w = works.get(it.work_id)
        title = w.title if w else "?"
        author = w.author if w else ""
        meta = f"{title} ({author})" if author else title
        lines.append(
            f"[T{n}] tray_item_id={it.id} | work_id={it.work_id} | {meta} | locator={it.locator}\n"
            f"{it.excerpt}"
        )
    block = "\n\n---\n\n".join(lines)

    system = (
        "You are Boswell, a scholarly assistant for English literature. "
        "Answer using ONLY the evidence excerpts below. "
        "Cite sources using the bracket labels [T1], [T2], etc. exactly as given. "
        "Do not invent quotations or line numbers not present in the excerpts. "
        "If the excerpts are insufficient, say so explicitly."
    )
    user = f"Question:\n{question}\n\nEvidence excerpts:\n\n{block}"
    try:
        content = await chat_completion(system, user, settings=settings)
    except Exception:
        logger.exception("Ollama synthesis failed for tray %s", tray_id)
        raise

    row = Analysis(
        analysis_type="synthesis",
        title=question[:200],
        content=content,
        tray_id=str(tray_id),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return content, row.id

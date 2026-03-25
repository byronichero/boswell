"""Concordance, keyword frequency, lite stylistics."""

from __future__ import annotations

import re
from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.work import Work

# Minimal English stopwords for keyword tab (MVP).
_STOPWORDS = frozenset(
    """
    a an and are as at be but by for from has he her his i if in into is it its me my no not
    of on or our s she so such t than that the their them then there these they this to too
    us was we were what when which who will with you your
    """.split()
)


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[A-Za-z']+", text.lower())


def concordance_hits(
    db: Session,
    *,
    query: str,
    work_ids: list[int],
    context_chars: int,
    max_hits: int = 200,
) -> tuple[list[dict[str, str | int]], int]:
    """
    Keyword-in-context over selected works (case-insensitive substring).

    Returns:
        (hits, total_count)
    """
    if not query.strip():
        return [], 0
    q_lower = query.lower()
    hits: list[dict[str, str | int]] = []
    total = 0
    stmt = select(Work).where(Work.id.in_(work_ids)) if work_ids else select(Work)
    works = db.execute(stmt).scalars().all()
    for w in works:
        text = w.content
        lower = text.lower()
        start = 0
        while True:
            pos = lower.find(q_lower, start)
            if pos < 0:
                break
            total += 1
            if len(hits) < max_hits:
                b = max(0, pos - context_chars)
                a = min(len(text), pos + len(q_lower) + context_chars)
                before = text[b:pos]
                after = text[pos + len(q_lower) : a]
                hits.append(
                    {
                        "work_id": w.id,
                        "work_title": w.title,
                        "locator": f"char:{pos}-{pos + len(q_lower)}",
                        "before": before,
                        "keyword": text[pos : pos + len(q_lower)],
                        "after": after,
                    }
                )
            start = pos + 1
    return hits, total


def keyword_frequencies(
    db: Session,
    *,
    work_ids: list[int],
    top_n: int = 50,
) -> list[tuple[str, int]]:
    """Return most common non-stopword tokens."""
    stmt = select(Work).where(Work.id.in_(work_ids)) if work_ids else select(Work)
    works = db.execute(stmt).scalars().all()
    counts: Counter[str] = Counter()
    for w in works:
        for tok in _tokenize(w.content):
            if tok not in _STOPWORDS and len(tok) > 1:
                counts[tok] += 1
    return counts.most_common(top_n)


def stylistics_lite(content: str) -> dict[str, float | int]:
    """Observational sentence stats and rough dialogue markers."""
    sentences = re.split(r"(?<=[.!?])\s+", content.strip())
    sentences = [s for s in sentences if s.strip()]
    sc = len(sentences)
    cc = len(content)
    avg = (cc / sc) if sc else 0.0
    dialogue_markers = content.count('"') + content.count("“") + content.count("”")
    return {
        "char_count": cc,
        "sentence_count": sc,
        "avg_sentence_length": round(avg, 2),
        "dialogue_line_markers": dialogue_markers,
    }

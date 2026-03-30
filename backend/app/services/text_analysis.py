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
    """Observational prose-oriented stats: sentences, words, punctuation (heuristic).

    Sentence splitting follows simple punctuation rules; verse, drama, and unpunctuated
    prose may skew counts. See API docs / UI disclaimer.
    """
    stripped = content.strip()
    sentences = re.split(r"(?<=[.!?])\s+", stripped)
    sentences = [s for s in sentences if s.strip()]
    sc = len(sentences)
    cc = len(content)

    tokens = _tokenize(content)
    word_count = len(tokens)
    unique_types = len(set(tokens)) if tokens else 0
    ttr = (unique_types / word_count) if word_count else 0.0

    avg_chars_per_sentence = (cc / sc) if sc else 0.0
    words_per_sentence_tokens = [_tokenize(s) for s in sentences]
    wps_flat = [len(w) for w in words_per_sentence_tokens]
    avg_words_per_sentence = (sum(wps_flat) / len(wps_flat)) if wps_flat else 0.0

    dialogue_markers = content.count('"') + content.count("“") + content.count("”")

    comma_count = content.count(",")
    semicolon_count = content.count(";")
    colon_count = content.count(":")
    question_mark_count = content.count("?")
    exclamation_mark_count = content.count("!")
    dash_em_en_count = content.count("—") + content.count("–")
    paren_open_count = content.count("(")
    paren_close_count = content.count(")")

    def per_1k(n: int) -> float:
        return round((n / word_count) * 1000, 2) if word_count else 0.0

    return {
        "char_count": cc,
        "sentence_count": sc,
        "avg_sentence_length": round(avg_chars_per_sentence, 2),
        "avg_words_per_sentence": round(avg_words_per_sentence, 2),
        "word_count": word_count,
        "unique_word_types": unique_types,
        "type_token_ratio": round(ttr, 4),
        "dialogue_line_markers": dialogue_markers,
        "comma_count": comma_count,
        "semicolon_count": semicolon_count,
        "colon_count": colon_count,
        "question_mark_count": question_mark_count,
        "exclamation_mark_count": exclamation_mark_count,
        "dash_em_en_count": dash_em_en_count,
        "paren_open_count": paren_open_count,
        "paren_close_count": paren_close_count,
        "comma_per_1k_words": per_1k(comma_count),
        "semicolon_per_1k_words": per_1k(semicolon_count),
        "colon_per_1k_words": per_1k(colon_count),
        "question_per_1k_words": per_1k(question_mark_count),
        "exclamation_per_1k_words": per_1k(exclamation_mark_count),
    }

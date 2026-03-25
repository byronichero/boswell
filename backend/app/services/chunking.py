"""Fixed-size character chunks with overlap."""

from __future__ import annotations


def chunk_text(text: str, chunk_size: int, overlap: int) -> list[tuple[int, str]]:
    """
    Split text into (chunk_index, chunk_text) segments.

    Args:
        text: Full document.
        chunk_size: Target maximum characters per chunk.
        overlap: Characters repeated from the previous chunk.

    Returns:
        List of chunks with zero-based indices.
    """
    if chunk_size <= 0:
        return [(0, text)]
    step = max(1, chunk_size - max(0, overlap))
    chunks: list[tuple[int, str]] = []
    start = 0
    idx = 0
    while start < len(text):
        end = min(len(text), start + chunk_size)
        piece = text[start:end]
        chunks.append((idx, piece))
        idx += 1
        if end >= len(text):
            break
        start += step
    return chunks


def char_locator(start: int, end: int) -> str:
    """Build a simple character-range locator string."""
    return f"char:{start}-{end}"

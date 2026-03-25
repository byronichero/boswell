"""Qdrant collection for literary chunks."""

from __future__ import annotations

import logging
from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchAny,
    NearestQuery,
    PointStruct,
    VectorParams,
)

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


def _client(settings: Settings | None = None) -> QdrantClient:
    settings = settings or get_settings()
    return QdrantClient(url=settings.qdrant_url, prefer_grpc=False)


def ensure_collection(settings: Settings | None = None) -> None:
    """Create collection if missing."""
    settings = settings or get_settings()
    c = _client(settings)
    name = settings.qdrant_collection
    cols = {x.name for x in c.get_collections().collections}
    if name in cols:
        return
    c.create_collection(
        collection_name=name,
        vectors_config=VectorParams(size=settings.embedding_dimension, distance=Distance.COSINE),
    )


def make_point_id(work_id: int, chunk_index: int) -> int:
    """Deterministic unsigned point id (fits in 64-bit)."""
    return work_id * 1_000_000 + chunk_index


def upsert_chunks(
    work_id: int,
    title: str,
    chunks: list[tuple[int, str]],
    vectors: list[list[float]],
    settings: Settings | None = None,
) -> None:
    """Upsert chunk vectors for one work."""
    settings = settings or get_settings()
    ensure_collection(settings)
    c = _client(settings)
    points: list[PointStruct] = []
    for (idx, text), vec in zip(chunks, vectors, strict=True):
        pid = make_point_id(work_id, idx)
        payload: dict[str, Any] = {
            "work_id": work_id,
            "chunk_index": idx,
            "title": title,
            "text": text[:8000],
            "locator": f"chunk:{idx}",
        }
        points.append(PointStruct(id=pid, vector=vec, payload=payload))
    if points:
        c.upsert(collection_name=settings.qdrant_collection, points=points)


def search_chunks(
    query_vector: list[float],
    work_ids: list[int],
    limit: int,
    settings: Settings | None = None,
) -> list[Any]:
    """Semantic search restricted to work_ids (if non-empty)."""
    settings = settings or get_settings()
    ensure_collection(settings)
    c = _client(settings)
    flt: Filter | None = None
    if work_ids:
        flt = Filter(must=[FieldCondition(key="work_id", match=MatchAny(any=work_ids))])
    res = c.query_points(
        collection_name=settings.qdrant_collection,
        query=NearestQuery(nearest=query_vector),
        limit=limit,
        query_filter=flt,
        with_payload=True,
        with_vectors=False,
    )
    return list(res.points) if res.points else []

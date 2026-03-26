"""MinIO storage helpers for Knowledge Base documents."""

from __future__ import annotations

import io
import uuid
from dataclasses import dataclass

from minio import Minio
from minio.error import S3Error

from app.config import Settings, get_settings


@dataclass(frozen=True)
class StoredObject:
    bucket: str
    object_key: str


def _client(settings: Settings | None = None) -> Minio:
    settings = settings or get_settings()
    endpoint = settings.minio_endpoint.replace("http://", "").replace("https://", "")
    return Minio(
        endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=bool(settings.minio_secure),
    )


def ensure_bucket(settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    c = _client(settings)
    if c.bucket_exists(settings.minio_bucket):
        return
    c.make_bucket(settings.minio_bucket)


def put_bytes(
    data: bytes,
    *,
    filename: str,
    content_type: str,
    settings: Settings | None = None,
) -> StoredObject:
    settings = settings or get_settings()
    ensure_bucket(settings)
    c = _client(settings)
    key = f"documents/{uuid.uuid4()}/{filename}"
    c.put_object(
        bucket_name=settings.minio_bucket,
        object_name=key,
        data=io.BytesIO(data),
        length=len(data),
        content_type=content_type or "application/octet-stream",
    )
    return StoredObject(bucket=settings.minio_bucket, object_key=key)


def put_bytes_at_key(
    data: bytes,
    *,
    object_key: str,
    content_type: str,
    settings: Settings | None = None,
) -> StoredObject:
    """Store bytes at a deterministic object key."""
    settings = settings or get_settings()
    ensure_bucket(settings)
    c = _client(settings)
    c.put_object(
        bucket_name=settings.minio_bucket,
        object_name=object_key,
        data=io.BytesIO(data),
        length=len(data),
        content_type=content_type or "application/octet-stream",
    )
    return StoredObject(bucket=settings.minio_bucket, object_key=object_key)


def get_object_stream(
    object_key: str,
    *,
    settings: Settings | None = None,
):
    """Return a streaming response object for an object."""
    settings = settings or get_settings()
    c = _client(settings)
    return c.get_object(settings.minio_bucket, object_key)


def stat_object(object_key: str, *, settings: Settings | None = None):
    settings = settings or get_settings()
    c = _client(settings)
    return c.stat_object(settings.minio_bucket, object_key)


def object_exists(object_key: str, *, settings: Settings | None = None) -> bool:
    """Check whether an object exists in MinIO."""
    try:
        stat_object(object_key, settings=settings)
        return True
    except S3Error:
        return False


def remove_object(object_key: str, *, settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    c = _client(settings)
    try:
        c.remove_object(settings.minio_bucket, object_key)
    except S3Error:
        # best-effort; DB is source of truth for now
        return


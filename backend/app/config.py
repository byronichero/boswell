"""Application settings loaded from environment."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://boswell:boswell@db:5432/boswell"

    memgraph_uri: str = "bolt://memgraph:7687"
    memgraph_user: str = ""
    memgraph_password: str = ""

    qdrant_url: str = "http://qdrant:6333"
    qdrant_collection: str = "boswell_chunks"

    ollama_host: str = "http://host.docker.internal:11434"
    ollama_embed_model: str = "nomic-embed-text"
    ollama_chat_model: str = "llama3.2"
    ollama_timeout_s: float = 300.0

    minio_endpoint: str = "http://host.docker.internal:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_secure: bool = False
    minio_bucket: str = "boswell"

    # Knowledge Base uploads: max size (413 when exceeded)
    max_upload_bytes: int = 25 * 1024 * 1024

    soft_scope_neighbor_periods: int = 1
    chunk_size: int = 1200
    chunk_overlap: int = 150
    embedding_dimension: int = 768

    max_tray_items: int = 40
    max_tray_excerpt_chars: int = 120_000

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    auto_seed_on_startup: bool = True
    auto_seed_index_sample: bool = True
    auto_seed_sync_memgraph: bool = True
    auto_seed_manifest_tier_b: bool = True
    auto_seed_manifest_download_timeout_s: int = 60

    # Kokoro TTS (separate Docker service; see kokoro-tts/)
    kokoro_tts_url: str = "http://kokoro-tts:8001"
    kokoro_tts_timeout_s: float = 300.0


@lru_cache
def get_settings() -> Settings:
    """Return cached settings singleton."""
    return Settings()


def cors_origins_list(settings: Settings | None = None) -> list[str]:
    """Parse CORS_ORIGINS into a list."""
    s = settings or get_settings()
    return [o.strip() for o in s.cors_origins.split(",") if o.strip()]

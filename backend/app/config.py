"""Application settings loaded from environment."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://boswell:boswell@db:5432/boswell"

    neo4j_uri: str = "neo4j://neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"

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

    soft_scope_neighbor_periods: int = 1
    chunk_size: int = 1200
    chunk_overlap: int = 150
    embedding_dimension: int = 768

    max_tray_items: int = 40
    max_tray_excerpt_chars: int = 120_000

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"


@lru_cache
def get_settings() -> Settings:
    """Return cached settings singleton."""
    return Settings()


def cors_origins_list(settings: Settings | None = None) -> list[str]:
    """Parse CORS_ORIGINS into a list."""
    s = settings or get_settings()
    return [o.strip() for o in s.cors_origins.split(",") if o.strip()]

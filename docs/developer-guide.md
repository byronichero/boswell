# Boswell — Developer guide

**Audience:** Contributors and integrators extending Boswell, running tests, and debugging the stack locally.

**Related:** [User guide](users-guide.md) · [Admin guide](admin-guide.md) · [`../README.md`](../README.md) · [`../boswell-prd.md`](../boswell-prd.md)

---

## Table of contents

1. [Repository layout](#repository-layout)
2. [Stack overview](#stack-overview)
3. [Local development (Docker)](#local-development-docker)
4. [Backend](#backend)
5. [Frontend](#frontend)
6. [Key integration points](#key-integration-points)
7. [Scripts](#scripts)
8. [Testing and quality](#testing-and-quality)
9. [API surface](#api-surface)
10. [Documentation map](#documentation-map)

---

## Repository layout

| Path | Purpose |
|------|---------|
| `backend/app/` | FastAPI application (`main`, routers, services, models) |
| `ui/` | React + Vite + TypeScript + Tailwind |
| `scripts/` | `init_data.py`, Gutenberg helpers, etc. |
| `docs/` | Starter corpus, `corpus-manifest.yaml`, **guides** (this folder) |
| `kokoro-tts/` | Dockerfile context for TTS service |
| `docker-compose.yml` | Full stack definition |
| `pyproject.toml` / `backend/requirements.txt` | Python tooling and deps |

---

## Stack overview

- **Postgres** — Relational source of truth (periods, works, document jobs).
- **Qdrant** — Embeddings and semantic chunk search.
- **Memgraph** — Bolt graph; `sync_from_postgres` mirrors `Work`–`Period` edges for scoped `work_id` queries (with SQL fallback in search).
- **Ollama (host)** — Embeddings and chat; backend uses `OLLAMA_HOST`.
- **Optional MinIO / S3** — Object storage for KB uploads (`minio_store`).

See `backend/app/services/memgraph_sync.py`, `qdrant_chunks.py`, `ollama_client.py`, and `document_ingest.py` for the main pipelines.

---

## Local development (Docker)

Recommended: run the full stack:

```bash
docker compose up --build
```

- API: `http://localhost:8000` — OpenAPI at `/docs`
- UI: `http://localhost:5173` — Vite proxies API and health routes

Initialize data:

```bash
docker compose exec backend python /app/scripts/init_data.py
```

Options: `--force`, `--skip-qdrant`, `--skip-memgraph`.

**User rule reminder:** Prefer `docker compose` (v2). Restart the stack after `docker-compose.yml` changes.

**SELinux:** Bind mounts use `:z` in compose for Fedora-style hosts; see [Admin guide](admin-guide.md).

---

## Backend

- **Language:** Python 3.11+ (see `backend/Dockerfile`).
- **Config:** Pydantic settings in `app/config.py`; env vars mirror `.env.example`.
- **Entry:** `uvicorn` in Docker; `app/main.py` mounts routers and startup bootstrap.

**Lint (from repo root, with venv containing deps):**

```bash
ruff check backend/app scripts
```

**Install deps locally (if not using only Docker):**

```bash
pip install -r backend/requirements.txt
```

---

## Frontend

- **Location:** `ui/`
- **Dev server:** Started by the `ui` Compose service (`npm install && npm run dev`).
- **Proxy:** Vite config proxies API and `/memgraph-lab` to backend / Memgraph Lab for same-origin embedding.

**Node:** `node_modules` live in a named volume (`ui_node_modules`) in Compose to avoid host/OS drift.

---

## Key integration points

| Concern | Where to look |
|---------|----------------|
| Period / work scope | `app/services/scope.py`, `memgraph_sync.py`, `routers/search.py` |
| Semantic search | `routers/search.py`, `qdrant_chunks.py`, `ollama_client.py` |
| Document ingest | `routers/documents.py`, `document_ingest.py`, Docling-related paths |
| Object storage | `services/minio_store.py` |
| Health | `routers/health.py` |
| Bootstrap | `services/bootstrap.py` |

---

## Scripts

| Script | Role |
|--------|------|
| `scripts/init_data.py` | Seed DB, optional Qdrant/Memgraph sync, sample Gutenberg path under `docs/` |
| `scripts/download_gutenberg.py` | Tier B corpus downloads per `docs/corpus-manifest.yaml` |

Tier B cache is gitignored (`docs/gutenberg/cache/`).

---

## Testing and quality

```bash
pytest
```

(from repo root; see `pyproject.toml` for configuration)

Add tests alongside features under `tests/` or as documented in `pyproject.toml`.

---

## API surface

- **Interactive docs:** `GET http://localhost:8000/docs` (Swagger UI)
- **OpenAPI JSON:** `/openapi.json`

Routers live under `backend/app/routers/`; prefix `/api` where applied in `main.py` (verify current mounts in `main.py`).

---

## Documentation map

| Document | Content |
|----------|---------|
| [`README.md`](../README.md) | Quick start, ports, init command |
| [`boswell-prd.md`](../boswell-prd.md) | Product requirements, architecture narrative |
| [`docs/README.md`](README.md) | Starter corpus tiers, manifest |
| [`users-guide.md`](users-guide.md) | End-user workflows |
| [`admin-guide.md`](admin-guide.md) | Deployment and operations |
| **This file** | Developer workflows and code map |

For governance-style multi-audience doc sets (inspired by projects like [Marlowe](https://github.com/byronichero/marlowe)), keep **users** on workflows, **admins** on infra, and **developers** on code and tests—cross-link rather than duplicate.

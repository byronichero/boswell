# Boswell — Administrator guide

**Audience:** People deploying, operating, and securing Boswell (Docker Compose, host services, environment, troubleshooting).

**Related:** [User guide](users-guide.md) · [Developer guide](developer-guide.md) · [`../README.md`](../README.md) · [`.env.example`](../.env.example)

---

## Table of contents

1. [Architecture summary](#architecture-summary)
2. [Prerequisites](#prerequisites)
3. [Installation and startup](#installation-and-startup)
4. [Ports and URLs](#ports-and-urls)
5. [Host services (Ollama, MinIO)](#host-services-ollama-minio)
6. [Environment variables](#environment-variables)
7. [SELinux (Fedora / RHEL family)](#selinux-fedora--rhel-family)
8. [Data initialization and backups](#data-initialization-and-backups)
9. [Health checks](#health-checks)
10. [Operations checklist](#operations-checklist)
11. [Troubleshooting](#troubleshooting)

---

## Architecture summary

The default stack (see `docker-compose.yml`) includes:

| Service | Role |
|---------|------|
| **backend** | FastAPI: API, ingest, search orchestration |
| **db** | PostgreSQL — works, periods, jobs, metadata |
| **qdrant** | Vector store for text chunks |
| **memgraph** | Graph DB — period ↔ work relationships for scoping |
| **memgraph-lab** | Web UI for the graph (embedded in app Graph Lab page) |
| **kokoro-tts** | Optional TTS endpoint used by the backend |
| **ui** | Vite dev server for the React UI |

**Not in Compose by default:** **Ollama** (LLM + embeddings) and optional **MinIO** (S3-compatible object storage for Knowledge Base uploads) run on the **host** or elsewhere; the backend reaches them via `host.docker.internal` where configured.

---

## Prerequisites

- **Docker** with **Compose v2** (`docker compose`, not legacy `docker-compose` unless aliased).
- **CPU/RAM** suitable for Postgres, Qdrant, Memgraph, and Kokoro; LLM workload is on the **host** (Ollama).
- **Ollama on the host** at `http://localhost:11434` with models matching compose/env, typically:
  - `nomic-embed-text` (embeddings)
  - `llama3.2` or another chat model (override `OLLAMA_CHAT_MODEL` if needed)

---

## Installation and startup

From the repository root:

```bash
cp .env.example .env   # optional; adjust secrets and URLs
docker compose up --build
```

After changing `docker-compose.yml`, **recreate** the stack (per project convention):

```bash
docker compose down
docker compose up --build
```

**Detached:**

```bash
docker compose up -d --build
```

---

## Ports and URLs

| Port | Service | Notes |
|------|---------|--------|
| **5173** | UI (Vite) | Main browser entry |
| **8000** | Backend API | OpenAPI at `/docs` |
| **5435** | Postgres (host map) | Internal DB name `boswell`; containers use `db:5432` |
| **6333** | Qdrant | HTTP API |
| **7687** | Memgraph Bolt | |
| **3000** | Memgraph Lab | Path `/memgraph-lab/` when `BASE_PATH` is set |
| **8001** | Kokoro TTS | |
| **11434** | Ollama | **Host only** — not started by this compose file |

---

## Host services (Ollama, MinIO)

### Ollama

Containers use **`http://host.docker.internal:11434`** (`OLLAMA_HOST`) with `extra_hosts: host.docker.internal:host-gateway` so the backend can reach the host’s Ollama.

- Ensure Ollama listens on an address reachable from Docker (often `0.0.0.0:11434` on the host).
- From **inside** a container, do **not** use `127.0.0.1:11434` for “Ollama on the host”—that points at the container itself.

### MinIO (optional)

Knowledge Base uploads expect **S3-compatible** storage when wired. `.env.example` documents host MinIO defaults (`MINIO_*`). If object storage is unavailable, behavior depends on implementation—treat MinIO/S3 as **required** for full KB features in production.

---

## Environment variables

Copy [`.env.example`](../.env.example) to `.env` and override as needed. Important groups:

- **Database:** `DATABASE_URL` (must match the `db` service if using Compose networking).
- **Memgraph:** `MEMGRAPH_URI`, optional `MEMGRAPH_USER` / `MEMGRAPH_PASSWORD`.
- **Qdrant:** `QDRANT_URL`, `QDRANT_COLLECTION`.
- **Ollama:** `OLLAMA_HOST`, `OLLAMA_EMBED_MODEL`, `OLLAMA_CHAT_MODEL`, `OLLAMA_TIMEOUT_S`.
- **CORS:** `CORS_ORIGINS` must include your UI origin (e.g. `http://localhost:5173`).
- **Uploads:** `MAX_UPLOAD_BYTES`.
- **Tray / scope:** `MAX_TRAY_*`, `SOFT_SCOPE_NEIGHBOR_PERIODS`, chunking vars.

Never commit real secrets.

---

## SELinux (Fedora / RHEL family)

Bind mounts from the home directory may be blocked by SELinux. This repository’s `docker-compose.yml` adds **`:z`** on `./docs`, `./scripts`, and `./ui` so containers can read/write relabeled content.

If you still see **Permission denied** on `/app/docs/...` or npm errors in `ui`, check:

```bash
getenforce
```

and AVC messages in the SELinux troubleshooter. Do not disable SELinux globally without policy guidance—fix labels or mount options instead.

---

## Data initialization and backups

**Seed periods, sample text, Memgraph graph, and Qdrant index** (after containers are healthy):

```bash
docker compose exec backend python /app/scripts/init_data.py
```

- `--force` — destructive reset (development only).
- `--skip-qdrant` / `--skip-memgraph` — if those services are down.

**Startup bootstrap** in the backend may also seed and sync (best-effort; failures should not block API startup).

**Backups (typical):**

- **Postgres:** dump `pgdata` volume or use `pg_dump` against `localhost:5435` with credentials from compose.
- **Qdrant / Memgraph:** snapshot or copy named volumes (`qdrant_data`, `memgraph_data`) with Docker offline, or use vendor backup guidance.

---

## Health checks

- **Liveness:** `GET /health`
- **Dependencies:** `GET /health/ready` — reports Postgres, Qdrant, Memgraph, Ollama (best-effort), etc.

Use these for load balancers or manual verification.

---

## Operations checklist

1. Host Ollama running with required models pulled.
2. `docker compose up --build` succeeds; no crash loop on `ui` or `backend`.
3. `curl -sS http://127.0.0.1:8000/health` and `/health/ready` acceptable.
4. Run `init_data.py` once for a demo corpus (or rely on bootstrap if enabled).
5. Open UI at `http://localhost:5173` and confirm Tutorial steps if needed.

---

## Troubleshooting

| Symptom | Things to check |
|---------|-------------------|
| `ECONNREFUSED` to `:8000` | Backend container logs; DB not healthy; build errors |
| UI `npm` errors / restart loop | SELinux `:z` on `./ui`; disk permissions; run `docker compose logs ui` |
| Bootstrap `Permission denied` on `/app/docs/...` | SELinux `:z` on `./docs`; file ownership on host |
| Semantic / chat failures | Ollama up; `OLLAMA_HOST` reachable; models installed; `/health/ready` |
| KB upload failures | MinIO/S3 endpoint, keys, bucket; `MAX_UPLOAD_BYTES` |
| Qdrant / Memgraph errors | Service logs; disk space; volume permissions |

For development commands and API details, see the [Developer guide](developer-guide.md).

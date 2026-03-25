# Boswell

English-literature analysis stack: **FastAPI** + **Postgres** + **Neo4j** (period scoping) + **Qdrant** (semantic chunks) + **Ollama** on the host (embeddings + synthesis). See [`boswell-prd.md`](boswell-prd.md) for the full product spec.

## Prerequisites

- Docker with Compose v2
- **Ollama** on the host (`http://localhost:11434`) with at least:
  - `nomic-embed-text` (embeddings)
  - `llama3.2` or another chat model (override `OLLAMA_CHAT_MODEL` in compose if needed)

## Quick start

```bash
cp .env.example .env   # optional overrides
docker compose up --build
```

- **API**: [http://localhost:8000](http://localhost:8000) — OpenAPI at `/docs`
- **UI**: [http://localhost:5173](http://localhost:5173) — Vite dev server proxies `/api` and `/health` to the backend
- **Postgres (host access)**: mapped to **localhost:5435** so it does not clash with a local server on 5432. Containers still use `db:5432` internally.

## Initialize data

After containers are up, load periods, the bundled `docs/gutenberg/shakespeare-sonnet-18.txt`, Neo4j graph, and Qdrant vectors:

```bash
docker compose exec backend python /app/scripts/init_data.py
```

Use `--force` to reset the DB and vector collection (development only). Use `--skip-qdrant` or `--skip-neo4j` if those services are unavailable.

## Project layout

| Path | Purpose |
|------|---------|
| `backend/app/` | FastAPI app (`/api/*`, `/health`) |
| `ui/` | React + Vite + Tailwind (Richelieu-style layout; Scottish blue / white / red accent) |
| `scripts/` | `init_data.py`, `download_gutenberg.py` |
| `docs/` | Starter corpus + `corpus-manifest.yaml` |

Host-only services **Ollama** and optional **MinIO** are not defined in Compose; the backend reaches them via `host.docker.internal` where needed.

## Development

- Python lint: `ruff check backend/app scripts` (from repo root with `pip install -r backend/requirements.txt`)
- Tests: `pytest` from repo root (see `pyproject.toml`)

## License

See individual documents and third-party texts (e.g. Project Gutenberg) for licensing.

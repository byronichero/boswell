# Boswell

**English-literature analysis** with an **evidence-first** workflow: explore a curated corpus, retrieve passages with **concordance** and **semantic** search, curate an **Evidence tray**, and synthesize answers **grounded in the excerpts you choose**—with **local LLMs** and vector search under your control.

**For students, teachers, and close readers**

Pick a **literary period** (with optional soft scope across neighboring eras), run **Concordance** and **Semantic** search over indexed works, add strong lines to the **Evidence tray**, then use **Evidence chat** and **Synthesize** to draft analysis tied to real quotations—not free-form hallucination. A **Knowledge Base** path ingests your documents when S3-compatible object storage is configured; **Graph Lab** embeds Memgraph Lab to visualize period–work relationships.

**Local-first.** Boswell runs on **your** stack: **Ollama** on the host for embeddings and chat, **Postgres** for works and metadata, **Memgraph** for relationship scoping, **Qdrant** for semantic chunks—so prompts and corpus data stay in your environment when you deploy that way.

The app is named after [James Boswell](https://en.wikipedia.org/wiki/James_Boswell) (1740–1795), Samuel Johnson’s friend and biographer—famously invoked when Johnson said, *“I am lost without my Boswell.”*

*Optional:* For a Marlowe-style centered portrait under the title, add **`ui/public/boswell.jpg`** and mirror the `<p align="center"><img … width="120" … /></p>` pattern from [Marlowe’s README](https://github.com/byronichero/marlowe). The UI sidebar already uses that path.

**Documentation:** [User guide](docs/users-guide.md) · [Admin guide](docs/admin-guide.md) · [Developer guide](docs/developer-guide.md) · [Product spec](boswell-prd.md)

## Stack

- **Backend:** Python 3.11+, FastAPI
- **Database:** PostgreSQL
- **Graph:** Memgraph (period–work scoping; Bolt / Cypher)
- **Vector store:** Qdrant
- **AI:** Ollama on the host (`host.docker.internal` from containers)
- **Document processing:** Docling-supported formats where enabled (Knowledge Base)
- **Object storage (optional):** MinIO or S3-compatible on the host
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Shadcn-style UI
- **Deployment:** Docker Compose

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
- **UI**: [http://localhost:5173](http://localhost:5173) — Vite dev server proxies `/api` and `/health` to the backend. **Getting started** (`/tutorial`) walks through corpus scope, Evidence tray, and demo seed commands; **Help** (`/help`) links into it.
- **Memgraph Lab** (`memgraph-lab` service): graph explorer; Quick Connect uses the `memgraph` Bolt service. With Compose, Lab is at `http://localhost:3000/memgraph-lab/` on the host (port 3000 published). The **Graph Lab** page (`/graph-lab`) embeds Lab via the same origin as the UI (`/memgraph-lab/` proxied by Vite to `memgraph-lab`), which avoids cross-origin iframe restrictions.
- **Postgres (host access)**: mapped to **localhost:5435** so it does not clash with a local server on 5432. Containers still use `db:5432` internally.

## Initialize data

After containers are up, load periods, the bundled `docs/gutenberg/shakespeare-sonnet-18.txt`, Memgraph graph, and Qdrant vectors:

```bash
docker compose exec backend python /app/scripts/init_data.py
```

Use `--force` to reset the DB and vector collection (development only). Use `--skip-qdrant` or `--skip-memgraph` if those services are unavailable.

## Project layout

| Path | Purpose |
|------|---------|
| `backend/app/` | FastAPI app (`/api/*`, `/health`) |
| `ui/` | React + Vite + Tailwind (sidebar layout; Scottish blue / white / red accent) |
| `scripts/` | `init_data.py`, `download_gutenberg.py` |
| `docs/` | Starter corpus + `corpus-manifest.yaml` |

Host-only services **Ollama** and optional **MinIO** are not defined in Compose; the backend reaches them via `host.docker.internal` where needed.

## Development

- Python lint: `ruff check backend/app scripts` (from repo root with `pip install -r backend/requirements.txt`)
- Tests: `pytest` from repo root (see `pyproject.toml`)

## <img src="ui/public/fedora_logo.svg.png" width="32" alt="Fedora" style="vertical-align: middle;" /> Built on Fedora

Boswell was developed on a custom-built AI workstation:

| Component | Specification |
|-----------|---------------|
| **OS** | Fedora Linux 42 (KDE Plasma, Wayland) |
| **CPU** | AMD Ryzen 9 9950X (32 threads) |
| **RAM** | 128 GiB |
| **GPU** | NVIDIA GeForce RTX 4060 |

The NVIDIA GPU is used exclusively for AI workloads via the [Fedora CUDA container](https://github.com/NVIDIA/nvidia-container-toolkit)—Ollama and other LLM inference run in the container for isolation and reproducibility. The host runs on AMD integrated graphics.

*Local LLMs, vector databases, and the full stack run on this machine.*

## License

See individual documents and third-party texts (e.g. Project Gutenberg) for licensing.

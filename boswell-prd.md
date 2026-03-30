
# Boswell – A Docker‑Based, Open‑Source English‑Literature Analysis AI App

> **Name Origin** – *Boswell* (Samuel Johnson’s faithful assistant)   "I am lost without my Boswell"
> **Scope** – Browse any public‑domain text (Beowulf → Conan Doyle), and produce **scholarly, inspectable analysis** over a curated corpus—aimed at English literature students, professors, and close readers (an NLTK‑style workflow: explore the text first, then synthesize).

---

## Table of Contents

1. [Literary Periods](#literary-periods)  
2. [Key Requirements & Suggested Open‑Source Components](#key-requirements)  
3. [Architecture Overview](#architecture)  
4. [Scholarly corpus UX & Evidence Tray](#product-ux)  
4.1. [Functional requirements (MVP)](#functional-requirements)  
4.2. [Non-functional requirements (MVP)](#non-functional-requirements)  
5. [Directory Structure](#directory-structure) (includes [starter corpus](#starter-corpus))  
6. [Docker & Compose (Host Services Only)](#docker)  
7. [FastAPI Backend Skeleton](#backend)  
8. [Data Initialization (Ingest + Index)](#data-initialization)  
9. [CI/CD Pipeline (GitHub Actions)](#cicd)  
10. [Environment Variables](#env)  
11. [Testing Outline](#testing)  
12. [Documentation & Maintenance](#documentation)  
13. [Summary](#summary)  
14. [Reference Apps](#reference-apps)  

---

## 1. Literary Periods <a name="literary-periods"></a>

| Period                | Start Year | End Year | Representative Authors & Works | Notes |
|-----------------------|------------|----------|---------------------------------|-------|
| **Old English**       | 450 – 1100  | –        | *Beowulf* (anonymous)           | Early Anglo‑Saxon epic. |
| **Middle English**   | 1100 – 1470 | –        | *Sir Gawain & the Green Knight*, *The Canterbury Tales* | Pre‑modern prose & poetry. |
| **Early Modern**     | 1470 – 1700 | –        | *Marlowe – The Tragedy of Othello*, *John Milton – Paradise Lost* | Early Shakespeare, Renaissance. |
| **Late Modern (18th c.)** | 1700 – 1800 | – | *Samuel Johnson – Dictionary*, *Mary Wollstonecraft – A Vindication of the Rights of Woman* | Enlightenment literature. |
| **Victorian**         | 1830 – 1901 | –        | *Charles Dickens – Oliver Twist*, *Oscar Wilde – The Picture of Dorian Gray* | Gothic & social realism. |
| **Edwardian & Pre‑War** | 1899 – 1914 | – | *Arthur Conan Doyle – Sherlock Holmes*, *Emily Brontë – Wuthering Heights* | Late Victorian realism. |
| **Modernism**         | 1914 – 1945 | –        | *Ezra Pound – The Cantos*, *Virginia Woolf – Mrs. Dalloway* | Experimental & stream‑of‑consciousness. |
| **Post‑War & Contemporary** | 1945 – present | – | *T. S. Eliot – The Waste Land*, *James Joyce – Ulysses* | Post‑modern & global English. |

> **Note** – These periods are stored in the `periods` table and can be used to filter texts by era in the UI.

---

## 2. Key Requirements & Suggested Open‑Source Components <a name="key-requirements"></a>

| Requirement | Why it matters | Suggested component |
|-------------|----------------|---------------------|
| **Public‑domain corpus** | No copyright issues – everything is free to use. | Project Gutenberg (CC‑0) |
| **Docker** | Reproducible, isolated runtime. | Docker Engine + `docker‑compose` |
| **Python backend** | Rich NLP ecosystem, fast API. | FastAPI + Pydantic + SQLAlchemy |
| **Open‑source LLM** | Avoid API costs, full control. | **Ollama** (host localhost only) |
| **Vector search** | Fast semantic retrieval of relevant passages. | Qdrant |
| **Search indexing** | Keyword + full‑text search. | Memgraph (graph) + Qdrant (vector) |
| **Web UI** | User‑friendly interaction. | React + Next.js (static build) or HTMX |
| **LLM inference** | Local chat + embeddings. | Ollama (host localhost only) |
| **CI/CD** | Quality & reproducibility. | GitHub Actions + Docker Hub |

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Backend | Python 3.10+, FastAPI | REST API, async handlers |
| Database | PostgreSQL (asyncpg) | Works, periods, authors, and generated analyses |
| Vector Store | Qdrant | Literary text chunk embeddings, semantic search |
| Graph | Memgraph | Authors/books/period relationships, semantic analytics |
| Cache | Redis | Sessions, caching |
| Object Storage | MinIO (S3-compatible) | User uploads and downloadable analysis artifacts (Markdown/HTML) |
| AI | Ollama (default) | Chat + embeddings for analysis |
| Document Processing | Docling (default) | Used for user-uploaded files → Markdown; Gutenberg plain text can be indexed directly |
| Frontend | React, Vite, TypeScript, Tailwind, Shadcn UI, ECharts | SPA, dashboards, visualisations |
| Chat UI | CopilotKit, LangGraph | AI chat over literary  context |
| Agent Frameworks | langchain, crewai (optional) | Pipeline and agent orchestration |
| ETL (optional) | Apache Airflow | Scheduled data pipelines |



## 3. Architecture Overview <a name="architecture"></a>

```
┌───────────────────────┐
│      React/Next.js     │  ← Front‑end (SPA or HTMX)
└─────────────┬─────────┘
              │ HTTP
              ▼
┌───────────────────────┐
│   FastAPI / Python    │  ← API gateway & orchestration
│  ├───────────────────┐│
│  │  /works/{id}      ││
│  │  /evidence-tray   ││
│  │  /search          ││
│  │  /analysis        ││
│  │  /periods         ││
│  └───────────────────┘│
└─────────────┬─────────┘
              │ DB / KV
┌─────────────▼─────────┐
│  PostgreSQL + SQLA‑CK |  ← Stores works, analyses, users
└─────────────┬─────────┘
              │ Graph
┌─────────────▼─────────┐
│  Memgraph                |  ← Stores period scoping + author/work relationships
└─────────────┬─────────┘
              │ Vector
┌─────────────▼─────────┐
│  Qdrant                |  ← Stores passage embeddings
└─────────────┬─────────┘
              │ Model
┌─────────────▼─────────┐
│  Ollama (host)       |  ← LLM inference
└───────────────────────┘
```

**Flow**  
1. User selects a period (**soft scoping** by default: neighbor periods or year window; **hard scoping** optional later) and uses tool tabs (Concordance, Keywords, Stylistics) to explore the corpus.  
2. Selected excerpts accumulate in a persistent **Evidence tray** (work + stable locator + optional note).  
3. FastAPI resolves eligible works via Memgraph; Qdrant retrieves relevant chunks when the user searches semantically.  
4. **Synthesize analysis** consumes the tray (plus optional free‑text prompt): Ollama must ground claims in tray items and cite them by tray id.  
5. Analysis results are stored in Postgres; optional tray + synthesis exports (Markdown/HTML) to MinIO.

---

## 4. Scholarly corpus UX & Evidence Tray <a name="product-ux"></a>

### Audience and product posture
Boswell targets readers who want **evidence-backed** literary interpretation: professors, graduate students, and serious amateurs. The UI should feel like **corpus tooling first** (explore, measure, cite), with LLM synthesis as a **capstone**—not a black box.

### Tool-first workflow (tabs)
Primary navigation is tabbed exploration over the scoped corpus:

| Tab | Purpose (MVP) |
|-----|----------------|
| **Corpus / Browse** | Period → work → text or chunk view; set soft/hard period filter. |
| **Concordance** | Keyword + context window; filter by work/period; add lines to Evidence tray. |
| **Keywords** | Frequency-style lists over the current scope (with sensible English stopwords); add contexts to tray. |
| **Stylistics (lite)** | Heuristic stats (e.g. sentence length, dialogue markers)—label as observational, not full stylometry. |
| **Synthesize** | Builds analysis from **Evidence tray** + user prompt; optional export. |

### Evidence tray (first-class object)
The Evidence tray is a **persistent panel** visible across all tabs. It is the **single committed input** for synthesis (plus optional instructions). Nothing should appear in synthesized analysis as “evidence” unless it came from the tray or is explicitly labeled as general background.

**Each tray item should carry:**
- `tray_item_id` (stable id for citations in synthesis output)
- `work_id`, work title, author, period (for display)
- **Locator** (MVP pick one and document): e.g. `chunk_id` + `chunk_index`, or character offset range in source text
- `excerpt` (verbatim text shown to the user and passed to the model)
- Optional `note` (user annotation: why this passage matters)

**Acceptance criteria (MVP):**
- User can add/remove/reorder tray items from Concordance, Keywords, Stylistics, and semantic search hits.
- Synthesis prompt includes tray items **verbatim** and instructs the model to **cite by `tray_item_id`** and not to invent quotations.
- Soft period scope is **visible in UI** (e.g. “Including neighbor periods: …”) so scholars are not misled.
- Optional: export tray + notes as Markdown (MinIO or download).

### Period scoping: soft first, hard later
- **Default (soft):** Memgraph/Qdrant candidate works include the selected period plus **neighbor periods** (table order) or a **year window** around period boundaries—configurable.
- **Later (hard):** Strict filter to works whose period/year falls only inside the selected era.

### API sketch (Evidence tray)
Add routes such as `GET/POST/PATCH/DELETE /evidence-tray/...` (or session-scoped `tray_id`) backed by Postgres; `POST /analysis/synthesize` accepts `{ tray_items | tray_id, question, scope }` and returns structured analysis with citations.

### Functional requirements (MVP) <a name="functional-requirements"></a>

| ID | Area | Requirement | Acceptance (high level) | Priority |
|----|------|-------------|-------------------------|----------|
| **FR‑001** | Corpus / Browse | User browses works in the current **period scope** (soft default). | List shows title, author, year, period; **scope label** explains which periods/years are included. | P0 |
| **FR‑002** | Concordance | Keyword in context (KWIC) over the scoped corpus with configurable context window. | Each hit can be **added to Evidence tray** with stable locator. | P0 |
| **FR‑003** | Keywords | Frequency-style term lists over the current scope (English stopword list configurable). | User can open contexts and **add to tray**. | P0 |
| **FR‑004** | Stylistics (lite) | Heuristic metrics only (e.g. sentence-length stats, simple dialogue markers); not full stylometry. | UI labels output **observational**; user may attach supporting **excerpts to tray** where applicable. | P1 |
| **FR‑005** | Evidence tray | Persistent panel across tabs: create, list, update, delete, reorder, per-item **note**. | Every item has `tray_item_id`, locator, excerpt; tray state persisted (session or Postgres per user). | P0 |
| **FR‑006** | Semantic search | Vector retrieval over **Qdrant** chunks restricted to Memgraph-scoped `work_id`s. | Results show score, excerpt, work ref; **add to tray**. | P0 |
| **FR‑007** | Synthesize | Analysis from **tray + prompt**; model must **cite tray ids** and not invent quotations. | Output uses explicit references (e.g. `[T1]`, `[T2]`) tied to tray items; optional structured JSON + Markdown. | P0 |
| **FR‑008** | Export | Download tray + notes and/or synthesis as Markdown (optional HTML). | File download and/or MinIO presigned URL. | P1 |
| **FR‑009** | Period scoping | **Soft** filter default (neighbor periods or year window); **hard** filter available later. | Soft mode shows **which** neighbor periods or window is active in the UI. | P0 |

### Non-functional requirements (MVP) <a name="non-functional-requirements"></a>

| ID | Category | Requirement | Target / acceptance | Priority |
|----|----------|-------------|---------------------|----------|
| **NFR‑001** | Performance | Browse, concordance, and keyword endpoints respond quickly enough for interactive use. | **p95 under 2 s** for typical scoped queries on a dev-sized corpus; document load tests as corpus grows. | P0 |
| **NFR‑002** | Performance | Semantic search remains usable under normal load. | **p95 under 5 s** for Qdrant top‑k over scoped `work_id`s (tune `k`, chunk size, and hardware assumptions). | P0 |
| **NFR‑003** | Performance | Synthesis may be slow; avoid opaque hangs. | Configurable **Ollama timeout** (e.g. 120–600 s, env-driven); show progress / cancel where feasible. | P0 |
| **NFR‑004** | Capacity | Evidence tray must stay within model context limits. | **Max tray items** (e.g. 20–50) and/or **max total excerpt characters** with UI warning before synthesis. | P0 |
| **NFR‑005** | Reliability | Core app works when optional services misbehave. | Clear errors when **Ollama**, **Qdrant**, or **Memgraph** is unreachable; read-only browse may still work from Postgres where possible. | P0 |
| **NFR‑006** | Security | No secrets in frontend; safe defaults. | API keys and DB passwords only via **env** / secrets manager; document `.env.example` only with placeholders. | P0 |
| **NFR‑007** | Privacy (local-first) | Default deployment keeps analysis on user-controlled infra. | **Ollama + MinIO on localhost** by default; document that cloud LLM is out-of-scope unless explicitly configured. | P0 |
| **NFR‑008** | Accessibility | Core flows usable with keyboard and screen readers where practical. | Target **WCAG 2.1 AA** for primary navigation, tray, and synthesis (iterate; full audit P1). | P1 |
| **NFR‑009** | Observability | Enough logging to debug retrieval and synthesis issues. | Structured logs for tray id, work id, and request id on synthesis failures; optional OpenTelemetry later. | P1 |

---

## 5. Directory Structure <a name="directory-structure"></a>

```
boswell/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── routers/         # API routers
│   │   └── services/        # Retrieval & generation services
│   ├── Dockerfile
│   └── requirements.txt
├── ui/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/                 # React + Vite SPA
├── scripts/
│   ├── init_data.py             # Load Gutenberg texts + periods
│   └── download_gutenberg.py    # Tier B downloads per docs/corpus-manifest.yaml
├── docs/
│   ├── README.md            # Starter corpus policy
│   ├── corpus-manifest.yaml # Tier A/B/C roadmap; PG ebook IDs for Tier B
│   └── gutenberg/           # Optional PD .txt/.md + cache/ (downloads gitignored)
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── .env.example
└── README.md
```

### Starter corpus (`docs/`) <a name="starter-corpus"></a>

Ship a **small, documented** set of public-domain texts under `docs/` (e.g. `docs/gutenberg/*.txt`): starter files for dev and ingest smoke tests, **not** large corpora in git. **`docs/corpus-manifest.yaml`** defines **Tier A** (bundled samples), **Tier B** (breadth-first Gutenberg IDs fetched via `scripts/download_gutenberg.py` into gitignored `docs/gutenberg/cache/`), and **Tier C** (bulk ingest goals). See [`docs/README.md`](docs/README.md) for Gutenberg conventions, license notes, and the distinction between `docs/` (curated seed) and **MinIO** (runtime uploads/exports). A minimal sample text is included for concordance/keyword tests.

---

## 6. Docker & Compose (Host Services Only) <a name="docker"></a>

### Dockerfile (backend)

```dockerfile
# backend/Dockerfile
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies (only if you need GPU drivers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY backend/app ./app
COPY scripts ./scripts

# Expose FastAPI port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker‑compose.yml

```yaml
# docker-compose.yml
version: "3.8"

services:
  backend:
    build: ./backend
    restart: unless-stopped
    env_file: .env
    extra_hosts:
      # Needed on Linux to reach host-only services from inside Docker.
      - "host.docker.internal:host-gateway"
    volumes:
      - ./scripts:/app/scripts
    ports:
      - "8000:8000"
    depends_on:
      - db
      - memgraph
      - qdrant

  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: boswell
      POSTGRES_PASSWORD: boswell
      POSTGRES_DB: boswell
    volumes:
      - pgdata:/var/lib/postgresql/data

  memgraph:
    image: memgraph/memgraph:latest
    restart: unless-stopped
    ports:
      - "7687:7687"   # Bolt

  qdrant:
    image: qdrant/qdrant:latest
    restart: unless-stopped
    volumes:
      - qdrant_data:/qdrant/storage
    ports:
      - "6333:6333"   # Qdrant HTTP API

volumes:
  pgdata:
  qdrant_data:
```

> **Host services (mandatory):** Ollama and MinIO run on the **host machine only** (`localhost`).  
> They are not included as Docker services in this compose file.
>
> - Ollama: `http://localhost:11434`
> - MinIO: `http://localhost:9000`
>
> In Docker containers, use `http://host.docker.internal:11434` and `http://host.docker.internal:9000` to reach them.

---

## 7. FastAPI Backend Skeleton <a name="backend"></a>

### 7.1 `app/main.py`

```python
# backend/app/main.py
from fastapi import FastAPI
from .routers import works, analysis, search, periods, evidence_tray
from .db import engine, SessionLocal
from sqlalchemy.orm import sessionmaker

app = FastAPI(title="Boswell API")

# Dependency
Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Include routers
app.include_router(works.router, prefix="/works", tags=["works"])
app.include_router(evidence_tray.router, prefix="/evidence-tray", tags=["evidence-tray"])
app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
app.include_router(search.router, prefix="/search", tags=["search"])
app.include_router(periods.router, prefix="/periods", tags=["periods"])

@app.on_event("startup")
def startup_event():
    # Create tables if they don't exist
    from . import models
    models.Base.metadata.create_all(bind=engine)
```

### 7.2 Models (`app/models/`)

#### `work.py`

```python
# backend/app/models/work.py
from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from . import Base

class Work(Base):
    __tablename__ = "works"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    author = Column(String)
    year = Column(Integer, nullable=True)
    content = Column(Text)
    period_id = Column(Integer, ForeignKey("periods.id"))

    period = relationship("Period", back_populates="works")
```

#### `analysis.py`

```python
# backend/app/models/analysis.py
from sqlalchemy import Column, Integer, Text, String, ForeignKey
from . import Base

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    analysis_type = Column(String, index=True)  # thematic | stylistic | context | hybrid
    title = Column(String, index=True)
    content = Column(Text)
    period_id = Column(Integer, ForeignKey("periods.id"), nullable=True)
    user_id = Column(Integer, nullable=True)  # if you add auth
```

#### `period.py`

```python
# backend/app/models/period.py
from sqlalchemy import Column, Integer, String
from . import Base

class Period(Base):
    __tablename__ = "periods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    start_year = Column(Integer)
    end_year = Column(Integer)
```

### 7.3 Schemas (`app/schemas/`)

```python
# backend/app/schemas/work.py
from pydantic import BaseModel
from typing import Optional

class WorkBase(BaseModel):
    title: str
    author: Optional[str]
    year: Optional[int]
    content: str

class WorkCreate(WorkBase):
    pass

class WorkRead(WorkBase):
    id: int
    period: Optional[str]

    class Config:
        orm_mode = True
```

Similar schemas for analyses, search results, and periods.

### 7.4 Routers (`app/routers/works.py`)

```python
# backend/app/routers/works.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..models.work import Work
from ..schemas.work import WorkRead
from ..db import get_db

router = APIRouter()

@router.get("/{work_id}", response_model=WorkRead)
def read_work(work_id: int, db: Session = Depends(get_db)):
    work = db.query(Work).filter(Work.id == work_id).first()
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    return work
```

### Analysis Router (`app/routers/analysis.py`)

```python
# backend/app/routers/analysis.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas.analysis import AnalysisRequest, AnalysisResponse
from ..services.analysis_service import analyze_literature

router = APIRouter()

@router.post("/generate", response_model=AnalysisResponse)
async def generate_analysis(
    req: AnalysisRequest,
    db: Session = Depends(get_db),
) -> AnalysisResponse:
    # MVP: use Memgraph for period scoping + Qdrant for chunk retrieval + Ollama for synthesis.
    return await analyze_literature(req=req, db=db)
```

### 7.5 Search Service (`app/services/search.py`)

```python
# backend/app/services/search.py
import httpx
import json
from typing import List

class SearchService:
    def __init__(self, memgraph_uri: str, qdrant_url: str):
        self.memgraph_uri = memgraph_uri
        self.qdrant_url = qdrant_url

    async def semantic_search(
        self,
        query: str,
        limit: int = 10,
        *,
        period_id: int | None = None,
        work_ids: List[int] | None = None,
    ) -> List[int]:
        # 1) Memgraph scoping:
        #    - resolve candidate works by period_id (or accept provided work_ids)
        # 2) Qdrant retrieval:
        #    - embed query
        #    - retrieve top-k chunks filtered to candidate works
        # Return list of chunk IDs (MVP choice).
        pass
```

> **Implementation detail** – Use the official Bolt driver (`neo4j` Python package) against Memgraph; use `qdrant-client` or `httpx` to query Qdrant for embeddings.

### 7.6 Generation Service (`app/services/generation.py`)

```python
# backend/app/services/generation.py
import httpx

OLLAMA_HOST = "http://host.docker.internal:11434"

class GenerationService:
    async def generate_analysis(self, prompt: str, model: str = "llama3") -> str:
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{OLLAMA_HOST}/api/chat", json=payload)
            resp.raise_for_status()
            return resp.json()["message"]["content"]
```

---

## 8. Data Initialization (Ingest + Index) <a name="data-initialization"></a>

### `scripts/init_data.py`

```python
# backend/scripts/init_data.py
import requests
import json
from pathlib import Path
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.work import Work
from app.models.period import Period

GUTENBERG_API = "https://gutendex.com/books/"

def fetch_books():
    books = []
    url = GUTENBERG_API
    while url:
        r = requests.get(url)
        data = r.json()
        for book in data["results"]:
            # Only keep plain‑text versions
            txt_url = next((x["url"] for x in book["formats"].values() if x.endswith(".txt")), None)
            if txt_url:
                content = requests.get(txt_url).text
                books.append({
                    "title": book["title"],
                    "author": ", ".join(book["authors"]),
                    "content": content,
                    "year": book.get("year"),  # may be None
                })
        url = data.get("next")
    return books

def map_periods(books):
    period_map = {
        # mapping logic: year (if present) → period id
        # Works with unknown year are either skipped or mapped to a nearest/approximate period (MVP decision).
    }
    return period_map

def seed_db():
    session = SessionLocal()
    periods = [
        {"name": "Old English", "start_year": 450, "end_year": 1100},
        {"name": "Middle English", "start_year": 1100, "end_year": 1470},
        # ...
    ]
    for p in periods:
        session.add(Period(**p))
    session.commit()

    books = fetch_books()
    for b in books:
        period_id = period_map(b["year"])
        session.add(
            Work(
                title=b["title"],
                author=b["author"],
                year=b["year"],
                content=b["content"],
                period_id=period_id,
            )
        )
    session.commit()
    session.close()

if __name__ == "__main__":
    seed_db()
```

> **How to use** – Start the docker stack (backend + Postgres + Memgraph + Qdrant). Ensure Ollama + MinIO are running on the host.  
> Then run `docker compose up -d backend` and `docker compose exec backend python /app/scripts/init_data.py`.  

After seeding, run an indexing job (MVP sketch) that:
1. Chunks each `Work.content` from Postgres.
2. Embeds the chunks using Ollama embeddings.
3. Upserts chunk vectors + metadata into Qdrant (e.g. `work_id`, `period_id`, `chunk_index`, and a truncated `text` field for context).
4. Creates Memgraph relationships for period scoping (e.g. `(:Work)-[:IN_PERIOD]->(:Period)` and `(:Work)-[:WRITTEN_BY]->(:Author)`).

---

## 9. CI/CD Workflow <a name="cicd"></a>

### `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U test"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.10'
      - name: Install dependencies
        run: |
          pip install -r backend/requirements.txt
      - name: Run tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
        run: |
          pytest backend/tests
      - name: Build Docker image
        run: docker build -t boswell-backend ./backend
      - name: Push to Docker Hub (optional)
        if: github.ref == 'refs/heads/main'
        env:
          DOCKER_USERNAME: ${{ secrets.DOCKER_USER }}
          DOCKER_PASSWORD: ${{ secrets.DOCKER_PASS }}
        run: |
          echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
          docker tag boswell-backend:latest $DOCKER_USERNAME/boswell-backend:latest
          docker push $DOCKER_USERNAME/boswell-backend:latest
```

> **Notes**  
> - Use `pytest` for unit tests in `backend/tests`.  
> - Store credentials in GitHub secrets (`DOCKER_USER`, `DOCKER_PASS`).  
> - Optionally add a stage for UI linting (`eslint`, `prettier`).

---

## 10. Environment Variables <a name="env"></a>

```dotenv
# .env.example
# PostgreSQL
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_USER=boswell
POSTGRES_PASSWORD=boswell
POSTGRES_DB=boswell

# Memgraph (Bolt)
MEMGRAPH_URI=bolt://memgraph:7687
MEMGRAPH_USER=
MEMGRAPH_PASSWORD=

# Qdrant
QDRANT_URL=http://qdrant:6333

# OLLAMA (host localhost service; not a docker dependency)
OLLAMA_HOST=http://host.docker.internal:11434

# MinIO (host localhost service; not a docker dependency)
MINIO_ENDPOINT=http://host.docker.internal:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_SECURE=false
MINIO_BUCKET=boswell
```

> Copy `.env.example` to `.env` and modify if needed.

---

## 11. Testing Outline <a name="testing"></a>

### Unit Tests (`backend/tests/test_works.py`)

```python
def test_read_work(client, db_session):
    # Create a dummy Work
    work = Work(title="Test", content="Content", period_id=1)
    db_session.add(work)
    db_session.commit()
    # Use test client to hit endpoint
    response = client.get(f"/works/{work.id}")
    assert response.status_code == 200
    assert response.json()["title"] == "Test"
```

### Search Tests (`backend/tests/test_search.py`)

- Test Memgraph query generation.  
- Test Qdrant client integration.

### Generation Tests (`backend/tests/test_generation.py`)

- Mock HTTP requests to OLLAMA to test prompt assembly and response handling.

### Evidence tray & synthesis (`backend/tests/test_evidence_tray.py`, `test_synthesize.py`)

- Tray CRUD and stable `tray_item_id` across reorder/delete.  
- Synthesis request rejects or warns when tray is empty (product choice).  
- Synthesis output contains citation tokens matching tray ids when excerpts are provided.

### Non-functional spot checks

- Tray size limits enforced (NFR‑004): reject or warn when exceeding max items / character budget.  
- Synthesis respects configurable Ollama timeout (NFR‑003).  
- Health or degraded mode when Qdrant/Memgraph/Ollama unavailable (NFR‑005).

---

## 12. Documentation & Maintenance <a name="documentation"></a>

- Add a `docs/` folder with detailed API reference (auto‑generated via `pdoc3`).  
- Provide README sections on how to:

  - Run the full stack locally (`docker compose up`).  
  - Deploy to a cloud provider (e.g., Render, Fly.io).  
  - Run a scheduled data refresh job.  

- Maintain a changelog for versioning.

---

## 13. Summary <a name="summary"></a>

The architecture uses:

- **PostgreSQL** for relational data, Evidence tray state, and saved analyses.  
- **Memgraph** for period scoping (soft by default) and work/author/period relationships.  
- **Qdrant** for semantic vector search over literary chunks.  
- **Ollama** (host only) for embeddings and synthesis grounded in the Evidence tray.  
- **FastAPI** for the backend.  
- **React** (or any frontend) for tool-first tabs (Concordance, Keywords, Stylistics) and the persistent Evidence tray feeding **Synthesize**.

The repository layout and CI pipeline follow best practices, ensuring reproducible builds, unit tests, and optional Docker Hub deployment. Use GitHub actions to trigger automated builds on every push or PR.  

---
## 14. UI theme defaults <a name="reference-apps"></a>

### Scottish flag scheme
- Replace the existing portrait/logo asset with a Boswell mark (e.g. `/boswell-portrait.jpg`).
- Update the Tailwind/CSS palette to a Scottish-flag-inspired accent scheme (blue + white, with a limited red accent).
- Rename assistant titles, navigation labels, and app descriptions everywhere in layout metadata to “Boswell”.

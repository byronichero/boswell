# Boswell — Starter corpus (`docs/`)

This folder holds **reference and starter documents** for local development and demos, following the same idea as **Richelieu** / **Tocqueville**: ship a small, documented set of files with the repo; scale up via scripts or downloads rather than bloating git.

## Corpus tiers

| Tier | Location | Role |
|------|-----------|------|
| **A — Bundled** | [`gutenberg/`](gutenberg/) (committed) | Tiny samples for CI and smoke tests (e.g. [`shakespeare-sonnet-18.txt`](gutenberg/shakespeare-sonnet-18.txt)). |
| **B — Manifest download** | [`corpus-manifest.yaml`](corpus-manifest.yaml) + `gutenberg/cache/` (gitignored) | Breadth-first Project Gutenberg IDs plus **canonical anchor works** (below). Download with [`scripts/download_gutenberg.py`](../scripts/download_gutenberg.py). |
| **C — Bulk ingest** | Not in git | Full Shakespeare, full Marlowe, complete Holmes/Dickens, etc.—build ID lists from Gutenberg author pages and ingest from disk or object storage. |

### Canonical anchor works

These are listed under `canonical_anchor_works` in [`corpus-manifest.yaml`](corpus-manifest.yaml) and included in Tier B downloads: Boswell’s *Life of Johnson*, Byron’s *Childe Harold’s Pilgrimage*, Shakespeare’s *Hamlet*, Marlowe’s *Doctor Faustus*, Dickens’s *A Tale of Two Cities*, the King James Bible (PG), and the Book of Common Prayer (Scottish Episcopal / BCP-related text on PG—see manifest notes). Tier B also pulls **two Dickens novels** (*A Tale of Two Cities* and *Oliver Twist*) and **two Conan Doyle works**: *The Adventures of Sherlock Holmes* (short stories) and *The Sign of the Four* (novel). Hamlet and Faust were already in Tier B; Byron’s exemplar is *Childe Harold* (replacing a miscellaneous Byron volume).

[`corpus-manifest.yaml`](corpus-manifest.yaml) lists Tier A/B/C explicitly and includes notes for Tier C (author index URLs). Re-verify ebook IDs on [Project Gutenberg](https://www.gutenberg.org) before production use.

**Download Tier B (stdlib Python, needs network):**

```bash
python3 scripts/download_gutenberg.py --tier-b
python3 scripts/download_gutenberg.py --id 98 1564
```

Files are written as `docs/gutenberg/cache/pg<N>.txt`. The cache directory is listed in the repo root `.gitignore`.

## Purpose

- **Seed content** for concordance, keywords, stylistics, and Evidence-tray workflows before a full Gutenberg ingest pipeline runs.
- **Documented ingest surface** when the backend implements folder-based ingest (pattern: `POST .../documents/ingest` or `python -m app.scripts.ingest_docs`), aligned with Richelieu.

## `gutenberg/` — public-domain plain text

Place **Project Gutenberg** (or compatible) **`.txt`** or **`.md`** files under [`gutenberg/`](gutenberg/).

| Convention | Notes |
|------------|--------|
| **Format** | Prefer UTF-8 `.txt` from [Gutenberg](https://www.gutenberg.org) “Plain Text UTF-8”. |
| **Size** | Keep the **committed** set small (a few works). Large corpora belong in external storage or a download/ETL step—not the main git history. |
| **License** | Each ebook has its own terms; Gutenberg’s header/footer and [license page](https://www.gutenberg.org/policy/license.html) apply. Only commit works you are allowed to redistribute. |
| **Attribution** | A one-line comment or companion `.md` per file with Gutenberg ebook number and title is recommended. |

### Bundled starter (example)

- [`gutenberg/shakespeare-sonnet-18.txt`](gutenberg/shakespeare-sonnet-18.txt) — short public-domain sample (Shakespeare) for smoke tests.

## User uploads vs `docs/`

- **`docs/`**: curated starter / team reference, read-only in containers where mounted (`:ro`), optional auto-ingest on startup when implemented.
- **MinIO**: runtime user uploads and generated exports (Markdown/HTML), per PRD—not the same as `docs/`.

## Auto-ingest (when implemented)

When `DOCS_AUTO_INGEST=true` (or equivalent), the backend may ingest this tree into Qdrant on startup. Until then, use the seed script (`scripts/init_data.py`) or manual ingest endpoints as documented in the main README.

## Not committed (optional)

- Licensed or restricted texts: use `.gitignore` or a local-only path documented here—not in the public repo.

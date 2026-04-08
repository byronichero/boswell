# Boswell — User guide

**Audience:** Anyone using the Boswell web app for close reading, corpus exploration, and evidence-grounded analysis.

**Related:** [Admin guide](admin-guide.md) · [Developer guide](developer-guide.md) · In-app routes **Tutorial** (`/tutorial`) and **Help** (`/help`) when the UI is running.

---

## Table of contents

1. [What Boswell is for](#what-boswell-is-for)
2. [First launch](#first-launch)
3. [Corpus and period scope](#corpus-and-period-scope)
4. [Core tools](#core-tools)
5. [Evidence tray and chat](#evidence-tray-and-chat)
6. [Knowledge Base](#knowledge-base)
7. [Graph Lab and status](#graph-lab-and-status)
8. [Principles and limits](#principles-and-limits)

---

## What Boswell is for

Boswell supports an **evidence-first** workflow for English literature: explore the text with concrete tools (concordance, keywords, semantic search), **curate excerpts** in an **Evidence tray**, then ask questions and draft synthesis **grounded in what you actually selected**—not free-form hallucination.

- **Periods** are literary-historical frames for scoping (not a complete chronology of all English literature).
- **Soft scope** can include neighboring periods so you do not miss edges of an era; you can tighten scope when you need a stricter filter.

---

## First launch

1. Open the app URL your administrator gives you (local development is usually `http://localhost:5173`).
2. **Splash screen** — optional intro; you may dismiss it for later visits depending on browser storage.
3. Use the **sidebar** to move between Home, Corpus, analysis tools, Chat, Knowledge Base, Graph Lab, Status, FAQ, Tutorial, and Help.

**Built-in help:** The **Tutorial** (`/tutorial`) walks through a short workflow with copy-paste commands for loading demo data. **Help** (`/help`) summarizes the same ideas in reference form.

---

## Corpus and period scope

- **Corpus** (`/corpus`) — Browse **works** and **periods** that drive search and filters.
- **Header / tray scope** — On many pages you choose a **center period** and whether **soft scope** (neighbor periods) applies. Tools retrieve passages from works **in that scope** unless documented otherwise.

If nothing appears in search, widen the period, check soft scope, or confirm your deployment has **seeded works** and **indexed vectors** (see Admin guide).

---

## Core tools

| Area | Purpose |
|------|---------|
| **Concordance** | Keyword-in-context (KWIC) lines for a word or phrase. |
| **Keywords** | Frequency-style views to see salient terms in scope. |
| **Semantic** | Meaning-based retrieval over chunked text (needs embeddings and a vector index). |
| **Stylistics** | Quantitative / stylistic exploration where implemented. |
| **Synthesize** | Draft an answer **tied to the Evidence tray**; verify citations against your excerpts. |

Use these to **find** strong lines; use the tray to **keep** only what supports your argument.

---

## Evidence tray and chat

1. **Add** promising excerpts from search results into the **Evidence tray** (work reference + locator + excerpt).
2. **Edit or remove** weak matches—treat the tray like a working bibliography of quotations.
3. **Evidence chat** (`/chat`) — Ask targeted questions with the tray in context. If the assistant says evidence is insufficient, **add or refine** excerpts before generalizing.

---

## Knowledge Base

**Knowledge Base** (`/knowledge-base`) — Upload documents for ingest (formats depend on deployment: plain text, Markdown, and binary formats supported by the document pipeline). Files go to **object storage** when configured; the job completes when storage and indexing are ready.

Large uploads may be limited by server settings (`MAX_UPLOAD_BYTES` in environment). Ask your administrator if uploads fail.

---

## Graph Lab and status

| Page | Purpose |
|------|---------|
| **Graph Lab** (`/graph-lab`) | Embedded **Memgraph Lab** to visualize **period ↔ work** relationships (same graph the backend can use for scoping). |
| **App status** (`/status`) | Checks **backend health** and dependency readiness (e.g. vector DB, graph, host LLM). Use this when semantic search or synthesis fails unexpectedly. |

Direct Memgraph Lab on the host is often `http://localhost:3000/memgraph-lab/` when the stack exposes that port.

---

## Principles and limits

- **Evidence-grounded** — Prefer claims you can trace to passages you allowed into the tray.
- **Models vary** — Chat and embeddings depend on the **LLM stack** your deployment uses; quality and latency differ by model and hardware.
- **Public-domain and uploads** — Respect copyright and local policy for texts you analyze and store.

For runnable commands (e.g. loading the starter corpus), use the in-app **Tutorial** or see the [Developer guide](developer-guide.md) if you maintain your own instance.

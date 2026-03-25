# Gutenberg-style starter texts

Add **plain-text** public-domain works here (UTF-8 `.txt` or `.md`).

- Download from [Project Gutenberg](https://www.gutenberg.org) → **Plain Text UTF-8**.
- Rename files clearly, e.g. `austen-pride-and-prejudice.txt`, and note the **Gutenberg ebook #** in a comment at the top of the file or in [`../README.md`](../README.md).

The repository includes one **tiny** sample file for CI and local smoke tests; expand this set as needed without committing multi-megabyte corpora.

For a breadth-first set from Project Gutenberg, see **[`../corpus-manifest.yaml`](../corpus-manifest.yaml)** (Tier B) and run **`scripts/download_gutenberg.py`**; downloaded files go under **`cache/`** (gitignored), not here.

#!/usr/bin/env python3
"""Download Project Gutenberg plain text files listed in docs/corpus-manifest.yaml.

Uses only the Python standard library (urllib). Writes to docs/gutenberg/cache/ by default.
Do not commit downloaded files; cache/ is gitignored.

Example:
  python scripts/download_gutenberg.py --tier-b
  python scripts/download_gutenberg.py --id 151
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

_TIER_B_ID_RE = re.compile(
    r"^\s*(?:-\s*)?gutenberg_id:\s*(\d+)\s*$",
    re.MULTILINE,
)


def _repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _try_urls(gutenberg_id: int) -> list[str]:
    """Common PG plain-text URL patterns (epub cache vs files mirror)."""
    gid = gutenberg_id
    return [
        f"https://www.gutenberg.org/cache/epub/{gid}/pg{gid}.txt",
        f"https://www.gutenberg.org/files/{gid}/{gid}-0.txt",
        f"https://www.gutenberg.org/files/{gid}/{gid}.txt",
    ]


def download_one(gutenberg_id: int, dest_dir: Path, timeout: int = 60) -> Path:
    """Download first successful URL; return path to written file."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    out = dest_dir / f"pg{gutenberg_id}.txt"
    last_err: Exception | None = None
    for url in _try_urls(gutenberg_id):
        req = Request(url, headers={"User-Agent": "BoswellCorpusDownloader/1.0"})
        try:
            with urlopen(req, timeout=timeout) as resp:
                data = resp.read()
            out.write_bytes(data)
            return out
        except (URLError, TimeoutError) as e:
            last_err = e
            continue
    raise RuntimeError(f"Failed to download ebook {gutenberg_id}: {last_err!s}")


def load_tier_b_ids(manifest_path: Path) -> list[int]:
    """Parse tier_b_download gutenberg_id entries (stdlib-only; no PyYAML)."""
    text = manifest_path.read_text(encoding="utf-8")
    return [int(m.group(1)) for m in _TIER_B_ID_RE.finditer(text)]


def main() -> None:
    root = _repo_root()
    default_manifest = root / "docs" / "corpus-manifest.yaml"
    default_out = root / "docs" / "gutenberg" / "cache"

    parser = argparse.ArgumentParser(
        description="Download Gutenberg .txt files from corpus-manifest.yaml",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=default_manifest,
        help="Path to corpus-manifest.yaml",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=default_out,
        help="Directory to write pg<N>.txt files",
    )
    parser.add_argument("--tier-b", action="store_true", help="Download all tier_b_download IDs")
    parser.add_argument(
        "--id",
        type=int,
        nargs="*",
        default=[],
        help="Download specific Gutenberg ebook id(s)",
    )
    args = parser.parse_args()

    ids: list[int] = list(args.id)
    if args.tier_b:
        ids.extend(load_tier_b_ids(args.manifest))

    if not ids:
        parser.error("Provide --tier-b and/or --id <n> [<n> ...]")

    seen = set()
    for gid in ids:
        if gid in seen:
            continue
        seen.add(gid)
        try:
            path = download_one(gid, args.output_dir)
            print(f"OK {gid} -> {path}", file=sys.stderr)
        except Exception as e:
            print(f"FAIL {gid}: {e}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()

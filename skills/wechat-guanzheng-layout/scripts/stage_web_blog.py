#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path


REQUIRED = ["posts.json", "app.js", "scripts/build-index.mjs", "scripts/check-posts.mjs"]


def split_title(path: Path) -> tuple[str, str]:
    lines = path.read_text(encoding="utf-8").replace("\r", "").splitlines()
    first = next((i for i, line in enumerate(lines) if line.strip()), None)
    if first is None or not lines[first].startswith("# "):
        raise ValueError(f"{path} must contain an H1 title")
    title = lines[first][2:].strip()
    body = lines[:first] + lines[first + 1 :]
    while body and not body[0].strip():
        body.pop(0)
    return title, "\n".join(body).rstrip() + "\n"


def write_atomic(path: Path, text: str) -> None:
    pending = path.with_suffix(path.suffix + ".tmp")
    pending.write_text(text, encoding="utf-8")
    pending.replace(path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Stage a bilingual post in Guanzheng GitHub Blog")
    parser.add_argument("source", type=Path, help="Chinese Markdown with H1 title")
    parser.add_argument("--en-source", type=Path, required=True, help="English Markdown with H1 title")
    parser.add_argument("--repo", type=Path, required=True)
    parser.add_argument("--id", required=True)
    parser.add_argument("--date", required=True)
    parser.add_argument("--slug", required=True)
    parser.add_argument("--zh-title")
    parser.add_argument("--en-title")
    parser.add_argument("--update", action="store_true")
    args = parser.parse_args()

    repo = args.repo.resolve()
    missing = [name for name in REQUIRED if not (repo / name).exists()]
    if missing:
        raise ValueError(f"not a Guanzheng Blog checkout; missing: {', '.join(missing)}")
    if not re.fullmatch(r"[a-z0-9-]+", args.id):
        raise ValueError("--id must contain lowercase ASCII letters, digits, and hyphens")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.date):
        raise ValueError("--date must be YYYY-MM-DD")
    slug = re.sub(r"[^a-z0-9-]+", "-", args.slug.lower()).strip("-")
    if not slug:
        raise ValueError("--slug must contain ASCII letters or digits")

    inferred_zh, zh_body = split_title(args.source)
    inferred_en, en_body = split_title(args.en_source)
    zh_title, en_title = args.zh_title or inferred_zh, args.en_title or inferred_en
    zh_rel = f"posts/{args.id}-{slug}.md"
    en_rel = f"posts/{args.id}-{slug}.en.md"
    zh_path, en_path = repo / zh_rel, repo / en_rel
    posts_path = repo / "posts.json"
    posts = json.loads(posts_path.read_text(encoding="utf-8"))
    existing_index = next((i for i, post in enumerate(posts) if post.get("id") == args.id), None)
    if existing_index is not None and not args.update:
        raise ValueError(f"post id {args.id!r} already exists; use --update intentionally")
    if not args.update and (zh_path.exists() or en_path.exists()):
        raise ValueError("target post file already exists; use --update intentionally")

    entry = {
        "id": args.id,
        "date": args.date,
        "languages": {
            "zh": {"file": zh_rel, "title": zh_title},
            "en": {"file": en_rel, "title": en_title},
        },
    }
    if existing_index is None:
        posts.append(entry)
    else:
        posts[existing_index] = entry
    posts.sort(key=lambda post: post["date"], reverse=True)

    zh_path.parent.mkdir(parents=True, exist_ok=True)
    write_atomic(zh_path, zh_body)
    write_atomic(en_path, en_body)
    write_atomic(posts_path, json.dumps(posts, ensure_ascii=False, indent=2) + "\n")

    subprocess.run(["npm", "run", "build"], cwd=repo, check=True)
    subprocess.run(["npm", "run", "check"], cwd=repo, check=True)
    subprocess.run(["git", "diff", "--check"], cwd=repo, check=True)

    base = f"https://guanzhengpm.github.io/post.html?id={args.id}"
    print(json.dumps({
        "id": args.id,
        "date": args.date,
        "zh_file": zh_rel,
        "en_file": en_rel,
        "zh_url": base,
        "en_url": base + "&lang=en",
        "published": False,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""扫描 posts/ 下所有 .md 文件，自动生成 posts/posts.json。

写完或修改日记后运行一次即可：
    python3 build.py
列表标题、日期、摘要都会自动更新，你不需要手动改 JSON。
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
POSTS_DIR = ROOT / "posts"
MANIFEST = POSTS_DIR / "posts.json"

FRONT_MATTER = re.compile(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", re.S)


def parse(md_text):
    meta, body = {}, md_text
    m = FRONT_MATTER.match(md_text)
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                key, value = line.split(":", 1)
                meta[key.strip()] = value.strip()
        body = m.group(2)
    return meta, body


def summarize(body, limit=70):
    for para in re.split(r"\n\s*\n", body.strip()):
        text = re.sub(r"[#>*`_\[\]()!~-]", "", para)
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            return text[:limit] + ("…" if len(text) > limit else "")
    return ""


def date_from_name(name):
    m = re.match(r"(\d{4}-\d{2}-\d{2})", name)
    return m.group(1) if m else ""


def rebuild():
    posts = []
    for md in sorted(POSTS_DIR.glob("*.md")):
        meta, body = parse(md.read_text(encoding="utf-8"))
        posts.append({
            "file": md.name,
            "title": meta.get("title") or md.stem,
            "date": meta.get("date") or date_from_name(md.name),
            "summary": meta.get("summary") or summarize(body),
        })
    posts.sort(key=lambda p: p.get("date", ""), reverse=True)
    MANIFEST.write_text(
        json.dumps({"posts": posts}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return posts


if __name__ == "__main__":
    items = rebuild()
    print(f"已更新 {MANIFEST.relative_to(ROOT)}，共 {len(items)} 篇日记。")

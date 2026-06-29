#!/usr/bin/env python3
"""新建一篇日记，并自动更新日记列表。

用法：
    python3 new_post.py "今天的标题"
    python3 new_post.py "标题" --date 2026-07-01   # 指定日期（默认今天）
"""
import argparse
import datetime
import re
from pathlib import Path

import build  # 复用 build.py 里的 rebuild()

ROOT = Path(__file__).resolve().parent
POSTS_DIR = ROOT / "posts"


def slugify(title):
    """生成英文文件名片段；中文标题会回退为 'post'（日期已保证可区分）。"""
    s = title.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "post"


def unique_path(date, slug):
    base = f"{date}-{slug}"
    candidate = POSTS_DIR / f"{base}.md"
    i = 2
    while candidate.exists():
        candidate = POSTS_DIR / f"{base}-{i}.md"
        i += 1
    return candidate


def main():
    ap = argparse.ArgumentParser(description="新建一篇日记")
    ap.add_argument("title", help="日记标题")
    ap.add_argument("--date", default=datetime.date.today().isoformat(),
                    help="日期，格式 YYYY-MM-DD，默认今天")
    args = ap.parse_args()

    POSTS_DIR.mkdir(exist_ok=True)
    path = unique_path(args.date, slugify(args.title))
    path.write_text(
        f"---\ntitle: {args.title}\ndate: {args.date}\n---\n\n在这里写下今天的日记……\n",
        encoding="utf-8",
    )

    build.rebuild()
    print(f"已创建：{path.relative_to(ROOT)}")
    print("现在用编辑器打开它，开始写吧。写完后无需手动改列表。")


if __name__ == "__main__":
    main()

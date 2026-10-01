#!/usr/bin/env bash
# Rebuild the site from the CV source and publish. Usage: ./update.sh ["commit message"]
set -euo pipefail
cd "$(dirname "$0")"
git pull -q --rebase --autostash origin main   # pick up edits made on github.com (and the bot rebuilds)
python3 build.py
git add -A
git diff --cached --quiet && { echo "nothing changed"; exit 0; }
git -c user.name="leshenzhang" -c user.email="leshen.zhang.cn@gmail.com" commit -q -m "${1:-Update site from CV}"
git push -q origin main
echo "pushed; live in ~1 min"

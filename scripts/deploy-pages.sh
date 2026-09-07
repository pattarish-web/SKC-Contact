#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
GITHUB_PAGES=true GITHUB_REPOSITORY=pattarish-web/SKC-Contact NEXT_PUBLIC_BASE_PATH=/SKC-Contact npm run build
TMP=$(mktemp -d)
cp -a out/. "$TMP/"
touch "$TMP/.nojekyll"
cd "$TMP"
git init -b gh-pages >/dev/null
git config user.email "pattarish@gmail.com"
git config user.name "pattarish-web"
git add -A
git commit -m "Publish GitHub Pages site" >/dev/null
git remote add github https://github.com/pattarish-web/SKC-Contact.git
git push -f github gh-pages
echo "Published: https://pattarish-web.github.io/SKC-Contact/"

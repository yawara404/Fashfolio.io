#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Review and commit local changes before syncing. No files were uploaded.' >&2
  exit 1
fi
branch="$(git branch --show-current)"
if [[ -z "$branch" ]]; then
  echo 'Checkout a branch before syncing.' >&2
  exit 1
fi
git fetch origin
if git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
  if ! git merge-base --is-ancestor "origin/$branch" HEAD; then
    echo 'Remote changes need review. Sync stopped without overwriting either branch.' >&2
    exit 1
  fi
fi
python3 scripts/check_publish.py
git push --set-upstream origin "$branch"

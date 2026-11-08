#!/usr/bin/env bash
set -euo pipefail
TASK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$TASK_ROOT"
if [[ ! -x backend/.venv/bin/python || ! -d frontend/node_modules ]]; then
  echo '初回セットアップ: npm run setup を実行してください。' >&2
  exit 1
fi
exec backend/.venv/bin/python scripts/dev.py

#!/usr/bin/env bash
# Produce a Docker build context from the current Git working tree, without
# traversing runtime data or copying credentials. Docker reads the tar on stdin.
# Tracked edits and non-ignored untracked source files are included.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ "$(git rev-parse --is-inside-work-tree 2>/dev/null || true)" != true ]]; then
  echo 'A Git checkout is required for ./start.sh dev (Git checkout missing).' >&2
  exit 1
fi
git ls-files --cached --others --exclude-standard -z \
  | python3 scripts/filter-build-context.py \
  | tar --create --file=- --null --files-from=-

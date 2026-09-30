#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
batch_id="${1:-}"
if [[ -n "$batch_id" && ! "$batch_id" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo 'Invalid batch id' >&2; exit 2
fi
npx --no-install wrangler d1 migrations apply whaleshark-org --local
python3 - <<'PY'
from pathlib import Path
import re
p = Path('.dev.vars')
s = p.read_text() if p.exists() else ''
if re.search(r'^MOCK_APP=.*$', s, re.M):
    s = re.sub(r'^MOCK_APP=.*$', 'MOCK_APP=0', s, flags=re.M)
else:
    s += ('\n' if s and not s.endswith('\n') else '') + 'MOCK_APP=0\n'
p.write_text(s)
PY
mkdir -p local-data/matching
if ! curl -fsS http://localhost:4321/ >/dev/null 2>&1; then
  npx --no-install astro dev >local-data/matching/dev.log 2>&1 &
fi
for ((attempt=0; attempt<120; attempt++)); do
  if curl -fsS http://localhost:4321/ >/dev/null 2>&1; then
    open -a 'Brave Browser' "http://localhost:4321/app/matching/${batch_id}"; exit 0
  fi
  sleep 1
done
echo 'Dev server did not become ready; see local-data/matching/dev.log' >&2
exit 1

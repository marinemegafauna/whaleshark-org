#!/bin/sh
set -eu

node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); JSON.parse(require('fs').readFileSync('tsconfig.json','utf8')); console.log('JSON OK')"
PYTHONDONTWRITEBYTECODE=1 python3 - <<'PY'
import importlib.util

spec = importlib.util.spec_from_file_location("vault_sync", "scripts/vault_sync.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
repo_files = module.list_repo_files()
assert "site.md" in repo_files, "vault sync must enumerate content/site.md"
assert "pages/landing.md" in repo_files, "vault sync must enumerate page content"
assert "species/whale-shark.yaml" in repo_files, "vault sync must enumerate species content"
print("vault sync content enumeration OK")
PY
ruby -e "require 'yaml'; parsed = YAML.safe_load(File.read('content/species/whale-shark.yaml'), permitted_classes: [], aliases: false); abort 'wrong species id' unless parsed.fetch('id') == 'whale-shark'; puts 'species YAML OK'"
sqlite3 :memory: < migrations/0001_init.sql
echo "migration SQL OK"

image_count=$(find public/mock -type f -name '*.svg' | wc -l | tr -d ' ')
test "$image_count" = "6"
echo "mock SVG count OK (6)"

for required_path in \
  src/pages/index.astro \
  'src/pages/match/[id].astro' \
  src/pages/signin.astro \
  src/pages/app/index.astro \
  'src/pages/app/encounters/[id]/scars.astro' \
  src/content.config.ts \
  src/lib/content.ts \
  content/site.md \
  content/pages/landing.md \
  content/pages/bulk.md \
  content/pages/match.md \
  content/pages/signin.md \
  content/pages/app.md \
  content/species/whale-shark.yaml \
  src/pages/api/submit.ts \
  src/pages/api/scars.ts \
  'src/pages/api/submissions/[id]/confirm.ts'
do
  test -f "$required_path"
done

rg -q 'species\.fields' 'src/pages/app/encounters/[id]/scars.astro'
rg -q "getPageCopy\('landing'\)" src/pages/index.astro
rg -Fq "../../content/species/*.{yaml,yml}" src/lib/species.ts
rg -q "startsWith\('/api/scars'\)" src/middleware.ts
rg -q 'action="/api/submit"' src/pages/index.astro

if rg -n "textContent[[:space:]]*=[[:space:]]*'[^']+" src --glob '*.astro' || \
   rg -n 'textContent[[:space:]]*=[[:space:]]*"[^"]+' src --glob '*.astro'
then
  echo "hard-coded browser copy found in an Astro template" >&2
  exit 1
fi
echo "route and schema wiring OK"

#!/bin/sh
set -eu

node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); JSON.parse(require('fs').readFileSync('tsconfig.json','utf8')); console.log('JSON OK')"
ruby -e "require 'yaml'; parsed = YAML.safe_load(File.read('species/whale-shark.yaml'), permitted_classes: [], aliases: false); abort 'wrong species id' unless parsed.fetch('id') == 'whale-shark'; puts 'species YAML OK'"
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
  src/pages/api/submit.ts \
  src/pages/api/scars.ts \
  'src/pages/api/submissions/[id]/confirm.ts'
do
  test -f "$required_path"
done

rg -q 'species\.fields' 'src/pages/app/encounters/[id]/scars.astro'
rg -q "startsWith\('/api/scars'\)" src/middleware.ts
rg -q 'action="/api/submit"' src/pages/index.astro
echo "route and schema wiring OK"

# whaleshark.org

whaleshark.org is a community-facing front end for [Sharkbook](https://www.sharkbook.ai), the Wildbook instance for whale sharks. A photographer can upload a left-flank photo, review likely matches, and add the date, place, animal details, measurements, injuries, contributor details, and consent that make the photo a useful sighting record. Signed-in researchers can work through site encounters and record scars with a form generated from the species protocol.

The project is built on Sharkbook by Wild Me / Conservation X Labs, with Marine Megafauna Foundation as a contributing partner. The application is openly AI-assisted and is designed to become a reusable front-end template for other Wildbook projects. The `/how-it-works` page explains how encounters, sightings, individuals, detection, matching, and human review fit together, and how another species project can fork the same front end.

Every uploaded photo also receives a reviewer-only provenance check. Camera metadata, Content Credentials, exact-file hashes, and detector/matcher sanity signals produce a capped 0–3 attention score stored with the submission; the score can flag an image for closer human review but never rejects it or changes the public upload flow.

## Editing the text

All maintainer-editable site copy lives in `content/`: global names, navigation, site labels, footer text, and the canonical photo-credit registry are in `content/site.md`; page copy, image paths, and alt text are in `content/pages/*.md`; species vocabularies are in `content/species/*.{yaml,yml}`. Astro validates these files during checks and builds. They can be edited directly, exposed through a git-based CMS, or reflected into Obsidian with the optional `scripts/vault_sync.py` workflow.

## Screenshots

Screenshots will be added after the first Cloudflare preview deployment. The approved screen references live in `design/reference/`.

## Responsive

The interface uses two shared breakpoints: 900px for compact navigation and single-column workspaces, and 560px for phone-specific spacing and sticky action bars. Public and researcher headers expose accessible disclosure menus below 900px while keeping the public sign-in action visible.

On phones, bulk-upload controls and summaries stack, batch and submit actions stay reachable above the safe area, match actions become full-width, and workbench tables become encounter or scar cards. The researcher site rail is the one intentional horizontal scroller: it becomes a single snap-scrolling row of site chips beneath the app header. Scar markers remain percentage-positioned over the naturally scaling encounter image.

## Quick start (mock mode)

Requirements: Node 22 or newer and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

If the dev command exits before printing its ready URL, first check whether this repo already has a server listening on port 4321 (`lsof -nP -iTCP:4321 -sTCP:LISTEN`). Reuse that server or stop it explicitly before starting another; a second managed-shell launch can otherwise look like an Astro startup failure.

If installation reports `ENOTFOUND registry.npmjs.org`, the machine cannot currently reach the npm registry; retry from a network-enabled shell. `npm install --offline` works only after these packages have previously been cached and otherwise reports `ENOTCACHED`.

`MOCK=1` is the development default. It makes every screen browsable without network access or credentials:

- `/` — full public landing page with photo drop, live Sharkbook catalogue counts, and matching explanation
- `/bulk` — whole-dive photo upload with per-photo matching progress
- `/bulk/batch-demo/review` — grouped known/new-animal review before submission
- `/match/submission-demo` — ranked example match
- `/how-it-works` — the Wildbook, matching, review, and template explainer
- `/signin` — accepts any non-empty username and password in mock mode
- `/app` — researcher encounter workbench
- `/app/encounters/2fca3548/scars` — schema-driven scar entry

Before a change is merged, run:

```bash
npm test
npm run build
```

## Configure a real Wildbook

1. Copy `.env.example` to `.env` locally and set `WILDBOOK_BASE_URL` to a Wildbook ≥ 10.12 instance.
2. Run `npm run db:create`. Replace the placeholder `database_id` in `wrangler.toml` with the id Wrangler returns.
3. Apply the schema with `npm run db:migrate`.
4. Set a long random `SESSION_SECRET` and configure the same values as Cloudflare Worker secrets for deployment. Never commit credentials.
5. Replace the placeholder `locationIds` in `site.config.ts` with the instance’s real Wildbook `locationId` values.
6. Keep `PUBLIC_WRITE=dry-run`. `live` currently exposes only the real-mode whole-dive matching client for target-instance validation; single-photo media staging and final reviewed observation publication remain deliberately gated until consent-safe object storage and idempotency are implemented.
7. Deploy with `npm run deploy`.

Researcher passwords are forwarded to Wildbook’s login endpoint once and are never stored. The Worker stores only the resulting `JSESSIONID` in D1 against an HttpOnly site session.

## Template for another species

The application shell, Wildbook client, D1 store, and workbench are species-agnostic. Species vocabulary and field options are validated from YAML at build time. See [docs/TEMPLATE.md](docs/TEMPLATE.md) for the fork-and-configure guide.

## Current status

Implemented against real interfaces:

- Astro 7 server output on Cloudflare Workers
- Wildbook v3 login, encounter search, encounter/individual reads, media resolution, encounter creation, resumable uploads, bulk-import task polling, and match-result reads
- D1 sessions, scar records, encounter review status, public submissions, and bulk batches with per-photo items
- public whole-dive upload, deterministic mock processing, grouped batch review, and a researcher batch queue
- per-species Zod-validated YAML and schema-rendered scar forms
- species-driven public sighting reports for one photo or a whole dive, with stored public observations and tested Wildbook bulk-import rows

Currently mocked or pending agreement:

- encounter, media, and match fixtures are used when `MOCK=1`
- bulk items advance from queued through detection and matching to a deterministic mix of matched, likely-new, no-shark, and error results when `MOCK=1`
- uploaded image storage is represented by local SVG fixture keys; production object storage is not selected yet
- public writes stay in D1 while `PUBLIC_WRITE=dry-run`
- Wild Me agreement is still needed for service-account public encounter creation
- the real-mode bulk client implements Sharkbook’s `ResumableUpload` and v3 bulk-import/task interfaces, but needs validation against the target instance before `PUBLIC_WRITE=live`
- single-photo media staging and final reviewed observation publication remain disabled until the live write lifecycle is consent-safe and idempotent

Architecture and security boundaries are documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

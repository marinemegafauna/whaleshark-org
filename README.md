# whaleshark.org

whaleshark.org is a community-facing front end for [Sharkbook](https://www.sharkbook.ai), the Wildbook instance for whale sharks. A photographer can upload a left-flank photo, review likely matches, and add the date, place, animal details, measurements, injuries, contributor details, and consent that make the photo a useful sighting record. Signed-in researchers can work through site encounters and record scars with a form generated from the species protocol.

The project is built on Sharkbook by Wild Me / Conservation X Labs, with Marine Megafauna Foundation as a contributing partner. The application is openly AI-assisted and is designed to become a reusable front-end template for other Wildbook projects. The `/how-it-works` page explains how encounters, sightings, individuals, detection, matching, and human review fit together, and how another species project can fork the same front end.

Every uploaded photo also receives a reviewer-only provenance check. Camera metadata, Content Credentials, exact-file hashes, and detector/matcher sanity signals produce a capped 0–3 attention score stored with the submission; the score can flag an image for closer human review but never rejects it or changes the public upload flow.

## Learn pages

The public `/about-whale-sharks` page summarises the species, threats, 2025 IUCN Red List status, and why photo-identification matters. `/how-it-works` explains the Sharkbook data model, matching and review flow, including what happens to a contributor's photo and sighting details. Signed-in researchers have `/app/practice` for official Wild Me channels, documentation and videos, plus a draft `/app/collaboration` guide to Sharkbook access requests and current workarounds. All of their copy lives in `content/pages/`.

## Contribute (GitHub issues)

Signed-in users can file a feature request or problem at `/app/contribute`. The Worker stores each request in D1, rate-limits each Sharkbook username to one request per minute, and creates a labelled issue in the repository configured by `GITHUB_REPO` when the `GITHUB_TOKEN` Worker secret is present. If the token is absent or GitHub is temporarily unavailable, the D1 copy remains available rather than losing the request. Open `from-site` issues are read from GitHub, cached for five minutes in the `SESSION` KV namespace, listed on the page, and counted in the app header.

## Editing the text

All maintainer-editable site copy lives in `content/`: global names, navigation, site labels, footer text, and the canonical photo-credit registry are in `content/site.md`; page copy, image paths, and alt text are in `content/pages/*.md`; species vocabularies are in `content/species/*.{yaml,yml}`. Astro validates these files during checks and builds. They can be edited directly, exposed through a git-based CMS, or reflected into Obsidian with the optional `scripts/vault_sync.py` workflow.

## Screenshots

Screenshots will be added after the first Cloudflare preview deployment. The approved screen references live in `design/reference/`.

## Responsive

The headers expose accessible disclosure menus below 1100px so the expanded public and researcher navigation does not crowd. Workspaces switch to their compact or single-column layouts at 900px, and 560px handles phone-specific spacing and sticky action bars. The public sign-in action remains visible when its navigation collapses.

On phones, bulk-upload controls and summaries stack, batch and submit actions stay reachable above the safe area, match actions become full-width, and workbench tables become encounter or scar cards. The researcher site rail is the one intentional horizontal scroller: it becomes a single snap-scrolling row of site chips beneath the app header. Scar markers remain percentage-positioned over the naturally scaling encounter image.

## Quick start (mock mode)

Requirements: Node 22 or newer and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Managed sandboxes that prohibit local TCP listeners cannot run `astro dev` or browser-based local QA: Astro exits before becoming ready, and even a minimal local HTTP server fails to bind. In that environment, use `npm test`, `npx astro check`, and `npm run build`; perform rendered browser QA later in a local session that permits a loopback listener. Some managed shells also reject explicit temporary-file cleanup commands, so migration diagnostics should use an in-memory SQLite pipeline rather than a temporary database that needs removal.

```bash
{ for migration in migrations/*.sql; do sed -n '1,$p' "$migration"; done; printf '.schema contributions\n'; } | sqlite3 :memory:
```

## Configure a real Wildbook

1. Copy `.env.example` to `.env` locally and set `WILDBOOK_BASE_URL` to a Wildbook ≥ 10.12 instance.
2. Run `npm run db:create`. Replace the placeholder `database_id` in `wrangler.toml` with the id Wrangler returns.
3. Apply the schema with `npm run db:migrate`.
4. Set a long random `SESSION_SECRET` and configure the same values as Cloudflare Worker secrets for deployment. Never commit credentials.
5. Replace the placeholder `locationIds` in `site.config.ts` with the instance’s real Wildbook `locationId` values.
6. Keep `PUBLIC_WRITE=dry-run`. `live` currently exposes only the real-mode whole-dive matching client for target-instance validation; single-photo media staging and final reviewed observation publication remain deliberately gated until consent-safe object storage and idempotency are implemented.
7. Keep `SCAR_WRITEBACK=off`. Switch it to `append` for one site only after a supervised test with a researcher account confirms the merged `distinguishingScar` text in Sharkbook. Write-back uses that researcher's stored session cookie, replaces only whaleshark.org's previous `[scars v…]` line, and never overwrites human text.
8. Deploy with `npm run deploy`.

To connect the signed-in contribution form, set `GITHUB_REPO` to the target `owner/repository` and add `GITHUB_TOKEN` as a Cloudflare Worker secret with permission to create issues in that repository. Do not put the token in `wrangler.toml` or commit it to `.env`.

Researcher passwords are forwarded to Wildbook’s login endpoint once and are never stored. The Worker stores only the resulting `JSESSIONID` in D1 against an HttpOnly site session.

### Signing in

With `MOCK_APP=0`, sign in at `/signin` using your own Sharkbook account. The workbench uses that account for authenticated encounter and individual reads; it stores the resulting session cookie server-side and never stores the password. Scar write-back remains disabled unless `SCAR_WRITEBACK=append` is explicitly enabled after a supervised test. `PUBLIC_WRITE=dry-run` remains unchanged.

## Template for another species

The application shell, Wildbook client, D1 store, and workbench are species-agnostic. Species vocabulary and field options are validated from YAML at build time. See [docs/TEMPLATE.md](docs/TEMPLATE.md) for the fork-and-configure guide.

## Current status

Implemented against real interfaces:

- Astro 7 server output on Cloudflare Workers
- Wildbook v3 login, encounter search, encounter/individual reads, media resolution, encounter creation, resumable uploads, bulk-import task polling, and match-result reads
- D1 sessions, scar records, encounter review status, public submissions, and bulk batches with per-photo items
- D1-backed signed-in contribution requests with optional GitHub issue creation, open-issue caching, and per-user rate limiting
- public whole-dive upload, deterministic mock processing, grouped batch review, and a researcher batch queue
- per-species Zod-validated YAML and schema-rendered scar forms
- species-driven public sighting reports for one photo or a whole dive, with stored public observations and tested Wildbook bulk-import rows

Currently mocked or pending agreement:

- public encounter, media, and match fixtures are used when `MOCK=1`; the signed-in workbench follows `MOCK_APP`
- bulk items advance from queued through detection and matching to a deterministic mix of matched, likely-new, no-shark, and error results when `MOCK=1`
- uploaded image storage is represented by local SVG fixture keys; production object storage is not selected yet
- public writes stay in D1 while `PUBLIC_WRITE=dry-run`
- Wild Me agreement is still needed for service-account public encounter creation
- the real-mode bulk client implements Sharkbook’s `ResumableUpload` and v3 bulk-import/task interfaces, but needs validation against the target instance before `PUBLIC_WRITE=live`
- single-photo media staging and final reviewed observation publication remain disabled until the live write lifecycle is consent-safe and idempotent

Architecture and security boundaries are documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

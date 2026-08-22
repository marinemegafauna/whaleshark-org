# What we need from Wildbook for front ends like this one

A running list, kept as we build. Each item says what we hit, what we do today instead, and what would make it clean. Verified against Wildbook 10.12 (Aug 2026) source and the live Sharkbook.ai v3 API. Items marked **works** are there to show what already carries the load — most of it does.

## Already there (thank you)

- **v3 search with flat hits + `X-Wildbook-Total-Hits`** on `encounter`, `individual`, `annotation` — the workbench and the live stats band run on this. *works*
- **v3 create** (`POST /api/v3/encounters|individuals|occurrences|annotations` via `submissionId` + `ResumableUpload`), **bulk import** (`POST /api/v3/bulk-import`, task polling), **`PATCH /api/v3/encounters/{id}`** (JSON Patch incl. `measurements`, `locationId`, `individualId`). *works*
- **`POST /api/v3/media/resolve`** for image URLs + boxes by annotation id under bearer-token auth. *works*
- **Read-only bearer tokens** (`POST /api/v3/auth/token`, Account → API Access) with the MiewID embeddings inline in annotation search. *works*
- **`GET /api/v3/site-settings`** exposing `labeledKeyword` + `labeledKeywordAllowedValues`. *works, unused for scars*
- **OpenAPI** at `GET /api/v3/docs/openapi.yaml`. *works*

## Asks, in the order they bite

1. **Write-capable API credentials for an application, not a person.** Today every write (create encounter, bulk import) needs a username + password session; the bearer token is read-only. We run the public "drop a photo" flow under a person's login held as a secret. *Ask:* service accounts or scoped tokens (`encounters:create`, `bulk-import`) that an app can hold, revoke, and that show up as the app in provenance.

2. **A structured home for one-to-many records on an encounter — scars first.** Scars (region · type · severity · freshness · cause) don't fit the flat encounter fields; `distinguishingScar` is free text (half of recent whale shark encounters have one), `measurements` are numeric-only, and labeled keywords are per-image config. Wildbook already has an `OBSERVATION` key/value table per encounter (classic `EncounterSetObservation`) but v3 doesn't expose it. *Today:* research scar records live in our own database keyed by encounter/individual UUID with a schema version. As an interim write-back, whaleshark.org appends or replaces its own one-line `[scars v…] … (whaleshark.org, YYYY-MM-DD, user)` summary in `distinguishingScar` without changing the human text. Public reports also retain the structured injury-region chips, injury-appearance chips, original estimated/measured flag, consent timestamp, and reviewer provenance flags in `observations_json` / `provenance_json`; the data we'd send upstream includes those structured observations, the provenance score/signals/version, and the generated one-line injury summary alongside the recognized encounter fields and sampling protocol. *Ask:* v3 read/write for observations (or a `customFields` object) so these records can live upstream, plus per-species vocabularies definable without a config-file change.

3. **A v3 endpoint to trigger matching for an existing encounter, and match results for the public flow.** Matching runs as a side effect of bulk import / the legacy `/ia` servlet; `GET /api/v3/tasks/{id}/match-results` reads results back. *Today:* the real-mode whole-dive client uses bulk import to get a match; single-photo and final reviewed-row writes remain dry-run diagnostics until the write lifecycle is idempotent. *Ask:* `POST /api/v3/encounters/{id}/match` (or annotation-level) returning a task id; optional webhook on completion instead of polling.

4. **CORS on `/api/v3/*`** (allow-list per instance). *Today:* a Cloudflare Worker proxies every call; a static site or a phone web app cannot talk to Sharkbook directly. *Ask:* `Access-Control-Allow-Origin` for configured origins — a small config change, large unlock.

5. **Aggregations under session auth.** The agent-skill docs describe a bounded `terms` aggregation on search; with a session cookie the response carries no `aggregations` object (we count client-side over 3,000 hits). *Ask:* honour `aggs` for session callers, or a counts endpoint (`encounters?locationId=…&count=1`).

   `POST /api/v3/media/resolve` likewise returns 401 for a session-cookie caller (it works with the bearer token), so signed-in workbench thumbnails come directly from `mediaAssets[].url` on encounter search hits.

6. **Unauthenticated read for public data.** Every read needs a login, so the public catalogue (shark pages, recent sightings, photographer credits) must be served through our service account. *Ask:* a public read surface for individuals/encounters flagged publicly readable (`publiclyReadable` already exists on the encounter document).

7. **Project/site scoping.** `GET /api/v3/projects` is read-only and not a data boundary; per-site gating of what a signed-in site team sees is done on our side. *Ask:* project-scoped search/permissions in v3 so site dashboards and submissions are clean for everyone.

8. **Notify on re-sight.** "You'll get an email every time this shark is seen again" needs either a webhook when an individual gains an encounter, or a cheap poll endpoint (`individuals/{id}?since=`). *Today:* not built.

9. **A provenance/flag field on encounters (or media assets).** We compute a versioned reviewer flag from camera metadata, declared editing/AI software, C2PA Content Credentials, image format/dimensions, exact-file SHA-256 reuse, and detector/matcher sanity checks. It is deliberately a flag, never an auto-reject. *Today:* the result and hash live only in our D1 on `public_submissions` and `batch_items`, so Wildbook reviewers cannot see them after handoff. *Ask:* a `flags` or `provenance` object on `MediaAsset` (preferred for photo-level evidence), or an encounter-level reviewer flag in v3; ideally the detector should also expose “no animal found” as a clean machine-readable outcome.

## How we'd contribute

Items 4 and 5 look like small PRs we could open against `WildMeOrg/Wildbook` if welcome. Items 1–3 are design decisions for Wild Me; we can write the proposal and a reference implementation from this repo. Everything here is MIT and reusable by other species' front ends.

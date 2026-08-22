# Architecture

whaleshark.org is a **front end for a Wildbook instance** (Sharkbook.ai for whale sharks). It is built so that the whale-shark-specific parts live in configuration and content, and everything else can be reused by another species or project with its own Wildbook back end. See `docs/TEMPLATE.md` for the fork-this guide.

## Shape

```
Browser ──▶ Astro (Cloudflare Workers) ──▶ Wildbook v3 API (sharkbook.ai)
                    │                  └──▶ GitHub Issues (signed-in requests)
                    ├──▶ D1 (SQLite): scars, sessions, public submissions, contributions
                    └──▶ KV: Astro sessions + five-minute open-issue cache
```

- **Astro 7** with the Cloudflare adapter. Static pages where possible, server routes (`src/pages/api/*`) for everything that talks to Wildbook. Wildbook does not send CORS headers, so the browser never calls it directly; the Worker proxies.
- **Wildbook v3 API** (Wildbook ≥ 10.12, Aug 2026): `POST /api/v3/login` (session cookie), `POST /api/v3/search/{encounter|individual|annotation}` (OpenSearch DSL, flat hits, `X-Wildbook-Total-Hits`), `POST /api/v3/media/resolve`, `POST /api/v3/encounters`, `PATCH /api/v3/encounters/{id}`, `POST /api/v3/bulk-import`, `GET /api/v3/projects`, `POST /api/v3/auth/token` (read-only bearer). OpenAPI: `GET /api/v3/docs/openapi.yaml` on any instance.
- **Cloudflare D1** holds what Wildbook cannot yet store: per-species **scar records** (one-to-many per encounter, keyed by Wildbook encounter + individual UUIDs and a schema version), server-side **sessions**, and **public submissions** awaiting researcher confirmation. `public_submissions`, `batches`, and `batch_items` each carry `observations_json`: shared dive details live on the batch, per-animal details live on every item in its reviewed group, and single-photo details live on the submission. When Wildbook exposes a custom-field surface, D1 becomes a cache and the records are pushed upstream; the schema version on every row is what makes that migration mechanical.
- **Content layer** (`content/site.md`, `content/pages/*.md`, `content/species/*.{yaml,yml}`) holds every maintainer-editable display string and species vocabulary. `src/content.config.ts` defines strict Zod-validated Astro content collections; pages load their copy through `src/lib/content.ts`, so misspelled frontmatter keys fail checks and builds instead of disappearing silently. Images remain in `public/`; page entries hold their paths and alt text, while `content/site.md` is the single photo-credit registry.
- **Species schema** (`content/species/<slug>.yaml`) drives two deliberately separate forms. `fields` is the research scar protocol: body regions, injury types, severity, freshness, likely cause, confidence, plus labels and help text. `public_report` is the simpler public encounter vocabulary: ordered groups, field types, options, units, defaults, and conditional injury details. Editing the YAML changes both surfaces for every site without making public injury chips into scar records. Whale shark scar v1.0 follows Speed et al. 2008 (severity + seven injury categories) with a healing-colour freshness axis (Womersley et al. 2021) and a dichotomous-key style of help text (Anderson et al. 2025).
- **Site config** (`site.config.ts`) is technical configuration only: species slugs, Wildbook base URL, and the literal Wildbook `locationId` values used by workbench filters. Site names and all other display strings live in `content/`.

### Cloudflare runtime binding contract

Server routes and middleware obtain the D1 binding from the Cloudflare adapter's Astro-local runtime context at `locals.runtime.env.DB`; `src/lib/runtime.ts` is the single adapter boundary. Re-check that path against the installed `@astrojs/cloudflare` release whenever the adapter's major version changes. Mock mode intentionally falls back to the in-memory store without a binding.

## Auth

- **Researchers** sign in with their Wildbook account. The Worker forwards credentials to `POST /api/v3/login` once, keeps the `JSESSIONID` server-side in D1 against a random session id, and sets an HttpOnly cookie. The site never stores a password. Access equals the user's Wildbook access.
- **Public uploads** are designed to run under a **service account** (Workers secret), but reviewed observation publishing remains gated. `PUBLIC_WRITE=dry-run` records the report and its exact diagnostic bulk-import row in D1 and creates nothing upstream. Real-mode whole-dive matching can stage photos through `ResumableUpload`; single-photo media staging and final reviewed-row publication stay disabled until consent-safe object storage and target-instance idempotency are in place.

## Contribute data flow

`/app/contribute` and `POST /api/contribute` use the same signed-in gate as the research workbench. The route validates the request, writes the full title, description, optional page URL, username and timestamp to D1 first, and uses an atomic insert guard to allow one request per username per rolling minute. The session cookie, Wildbook session cookie and Worker secrets never enter the contribution row or issue body.

When `GITHUB_TOKEN` and `GITHUB_REPO` are configured through `runtimeValue`, the Worker calls GitHub's issue REST endpoint with `from-site` plus `feature-request` or `bug`. A successful issue number and URL are added to the D1 row. A missing token, network failure or non-success GitHub response leaves the complete D1 request intact and returns the calm stored-request state to the user. Open `from-site` issues are public reads; the token is optional there and is supplied only to raise the API rate limit. The mapped display list is cached under `contribute:issues` in the `SESSION` KV namespace for 300 seconds and provides the app-header count.

`GITHUB_TOKEN` is an environment secret and must never be committed, rendered into HTML, returned by the API, or included in an issue. Forks set `GITHUB_REPO` to their own repository.

## Matching

Detection + identification run through Wildbook's resumable-upload and bulk-import path, with task state read from `GET /api/v3/bulk-import/{taskId}` and candidates from `GET /api/v3/tasks/{taskId}/match-results`. The public flow therefore uploads or stages photos, polls results, and shows ranked candidates with cosine scores and the gap to the next animal. Until the write path is live, the single-photo and bulk match pages run against fixtures (`MOCK=1`).

## Provenance

Photo provenance is an attention flag for reviewers, never an acceptance rule. Layer 1 runs in the upload Worker before storage: `exifr` reads EXIF, XMP, IPTC and image dimensions; a byte scan notes C2PA/JUMBF Content Credentials; and SHA-256 identifies exact re-uploads. Layer 2 appends detector and matcher sanity signals such as no shark found, implausibly perfect matches, and same-batch duplicates. Signal weights sum to a score capped at 3 (0 nothing notable, 1 check, 2 possible edit/AI, 3 likely AI or synthetic), but every upload continues through the public flow unchanged.

`public_submissions` and `batch_items` store the versioned result as `provenance_json` and the original-byte digest as `sha256`, with indexed cross-table lookup. Only reviewer surfaces expose it: each `/bulk/[id]/review` photo and the signed-in `/app` workbench can show a content-driven disclosure chip. `/match/[id]` deliberately shows no provenance result to the public uploader. Reviewer wording and the maintained AI-tool string list live in `content/pages/provenance.md`.

## Batches

`batches` stores whole-dive metadata and review state, while `batch_items` stores each file's processing status, upstream task id, and match JSON. The public `/bulk` page creates a batch, uploads one or more files through Worker routes, polls the same D1-backed shape in mock or real mode, and groups review cards by best known individual or likely-new within-batch cluster. `PUBLIC_WRITE=dry-run` never calls Wildbook, and submitting a reviewed batch marks it ready for the researcher workbench without publishing it upstream.

Public observation values are normalized by `src/lib/public-observations.ts`. `src/lib/wildbook.ts` is the only Wildbook column-mapping boundary: it converts feet to metres and Fahrenheit to Celsius, builds the generated `distinguishingScar` summary, and emits the recognized `Encounter.*` / `Sighting.*` bulk-import keys. Structured injury choices and the consent timestamp remain in D1 because Wildbook 10.12 has no corresponding v3 cells.

## Scar records: two-way

The researcher scar workflow keeps D1 as the structured source while making Sharkbook's existing free text useful in both directions:

- **Pull:** the encounter read supplies `distinguishingScar`, `occurrenceRemarks`, `researcherComments`, life stage, length, and behaviour. The scar page shows the original distinguishing-scar text verbatim, extracts only scar-related sentences from the two longer note fields, and applies species-YAML `text_hints` when a researcher chooses **Categorise this**. Hints only preselect valid schema option ids; the researcher confirms and saves every field.
- **Queue:** `/app` classifies only the current 25-hit search page. It can show encounters with human Sharkbook scar text but no D1 scar record, while retaining the existing needs-record and all-encounters views. It does not crawl or paginate the full catalogue on page load.
- **Push:** `SCAR_WRITEBACK=off` is the default. With `append`, a successful D1 save fetches the current encounter under the researcher's own session cookie, merges one generated summary line into `distinguishingScar`, and sends a JSON Patch `replace`. Upstream failures never remove or roll back the D1 record; sync state is stored per scar and can be retried for the encounter.

The interim line contract is:

```text
[scars v<schema>] <body region>: <type> · <severity> · <freshness> · [probable|possible ]<likely cause>[ | <next scar>...] (whaleshark.org, YYYY-MM-DD, <observer>)
```

If human text already exists, the line follows it after one blank line. A later sync replaces only the previous line beginning `[scars v…]` and ending with the whaleshark.org source tuple; human text is unchanged. When Wildbook exposes the encounter observation/custom-field API requested in item 2 of `docs/WILDBOOK-ASKS.md`, the structured records move upstream and this summary becomes a display compatibility layer rather than the interchange format.

## Modes

| Surface | Setting | Effect |
|---|---|---|
| Public matching and uploads | `MOCK=1` | Fixtures stand in for Wildbook and public D1 flows |
| Signed-in workbench and sign-in | `MOCK_APP=1|0` | Fixtures when `1`, live Sharkbook reads when `0`; unset inherits `MOCK` |
| Public writes | `PUBLIC_WRITE=dry-run|live` | `dry-run` keeps reports local; final reviewed publication remains gated |
| Research scar write-back | `SCAR_WRITEBACK=off|append` | `off` keeps D1 authoritative; `append` merges the interim summary into `distinguishingScar` under the researcher session |

This split allows the deployed public site to remain deterministic and write-safe while signed-in researchers use real encounter UUIDs and media. The app-side D1 boundary follows `MOCK_APP`, so live sessions, review statuses, and scar records remain persistent even when public routes use fixtures.

## Not in v1

Dashboards beyond the season counts, user-built views, per-site gating beyond what Wildbook already enforces, a native mobile app.

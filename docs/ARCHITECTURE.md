# Architecture

whaleshark.org is a **front end for a Wildbook instance** (Sharkbook.ai for whale sharks). It is built so that the whale-shark-specific parts live in configuration and content, and everything else can be reused by another species or project with its own Wildbook back end. See `docs/TEMPLATE.md` for the fork-this guide.

## Shape

```
Browser ──▶ Astro (Cloudflare Workers) ──▶ Wildbook v3 API (sharkbook.ai)
                    │
                    └──▶ D1 (SQLite): scar records, sessions, public submissions
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

## Matching

Detection + identification run through Wildbook's resumable-upload and bulk-import path, with task state read from `GET /api/v3/bulk-import/{taskId}` and candidates from `GET /api/v3/tasks/{taskId}/match-results`. The public flow therefore uploads or stages photos, polls results, and shows ranked candidates with cosine scores and the gap to the next animal. Until the write path is live, the single-photo and bulk match pages run against fixtures (`MOCK=1`).

## Batches

`batches` stores whole-dive metadata and review state, while `batch_items` stores each file's processing status, upstream task id, and match JSON. The public `/bulk` page creates a batch, uploads one or more files through Worker routes, polls the same D1-backed shape in mock or real mode, and groups review cards by best known individual or likely-new within-batch cluster. `PUBLIC_WRITE=dry-run` never calls Wildbook, and submitting a reviewed batch marks it ready for the researcher workbench without publishing it upstream.

Public observation values are normalized by `src/lib/public-observations.ts`. `src/lib/wildbook.ts` is the only Wildbook column-mapping boundary: it converts feet to metres and Fahrenheit to Celsius, builds the generated `distinguishingScar` summary, and emits the recognized `Encounter.*` / `Sighting.*` bulk-import keys. Structured injury choices and the consent timestamp remain in D1 because Wildbook 10.12 has no corresponding v3 cells.

## Modes

- `MOCK=1` — no network; fixtures in `src/mock/` stand in for Wildbook and D1. Default for `npm run dev` until credentials are configured.
- `PUBLIC_WRITE=dry-run|live` — whether the existing real-mode whole-dive matching client may stage media and start its matching import. Single-photo and final reviewed-observation publishing remain gated.

## Not in v1

Dashboards beyond the season counts, user-built views, per-site gating beyond what Wildbook already enforces, a native mobile app.

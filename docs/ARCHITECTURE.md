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
- **Cloudflare D1** holds what Wildbook cannot yet store: per-species **scar records** (one-to-many per encounter, keyed by Wildbook encounter + individual UUIDs and a schema version), server-side **sessions**, and **public submissions** awaiting researcher confirmation. When Wildbook exposes a custom-field surface, D1 becomes a cache and the records are pushed upstream; the schema version on every row is what makes that migration mechanical.
- **Species schema** (`species/<slug>.yaml`) drives the scar-entry form: body regions, injury types, severity, freshness, likely cause, confidence, plus labels and help text. Editing the YAML changes the form for every site. Whale shark v1.0 follows Speed et al. 2008 (severity + seven injury categories) with a healing-colour freshness axis (Womersley et al. 2021) and a dichotomous-key style of help text (Anderson et al. 2025).
- **Site config** (`site.config.ts`): name, domain, species list, Wildbook base URL, sites/locations shown in the workbench, steward organisation, design tokens.

### Cloudflare runtime binding contract

Server routes and middleware obtain the D1 binding from the Cloudflare adapter's Astro-local runtime context at `locals.runtime.env.DB`; `src/lib/runtime.ts` is the single adapter boundary. Re-check that path against the installed `@astrojs/cloudflare` release whenever the adapter's major version changes. Mock mode intentionally falls back to the in-memory store without a binding.

## Auth

- **Researchers** sign in with their Wildbook account. The Worker forwards credentials to `POST /api/v3/login` once, keeps the `JSESSIONID` server-side in D1 against a random session id, and sets an HttpOnly cookie. The site never stores a password. Access equals the user's Wildbook access.
- **Public uploads** run under a **service account** (Workers secret) that creates an encounter via `POST /api/v3/encounters` flagged for the site's researchers to confirm. Until Wild Me has agreed the service-account pattern, `PUBLIC_WRITE=dry-run` records the submission in D1 and creates nothing upstream.

## Matching

Detection + identification run through Wildbook's resumable-upload and bulk-import path, with task state read from `GET /api/v3/bulk-import/{taskId}` and candidates from `GET /api/v3/tasks/{taskId}/match-results`. The public flow therefore uploads or stages photos, polls results, and shows ranked candidates with cosine scores and the gap to the next animal. Until the write path is live, the single-photo and bulk match pages run against fixtures (`MOCK=1`).

## Batches

`batches` stores whole-dive metadata and review state, while `batch_items` stores each file's processing status, upstream task id, and match JSON. The public `/bulk` page creates a batch, uploads one or more files through Worker routes, polls the same D1-backed shape in mock or real mode, and groups review cards by best known individual or likely-new within-batch cluster. `PUBLIC_WRITE=dry-run` never calls Wildbook, and submitting a reviewed batch marks it ready for the researcher workbench without publishing it upstream.

## Modes

- `MOCK=1` — no network; fixtures in `src/mock/` stand in for Wildbook and D1. Default for `npm run dev` until credentials are configured.
- `PUBLIC_WRITE=dry-run|live` — whether public submissions create Wildbook encounters.

## Not in v1

Dashboards beyond the season counts, user-built views, per-site gating beyond what Wildbook already enforces, a native mobile app.

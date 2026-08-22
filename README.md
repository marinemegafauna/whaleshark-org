# whaleshark.org

whaleshark.org is a community-facing front end for [Sharkbook](https://www.sharkbook.ai), the Wildbook instance for whale sharks. A photographer can upload a left-flank photo and review likely matches; signed-in researchers can work through site encounters and record scars with a form generated from the species protocol.

Marine Megafauna Foundation stewards the project. The application is openly AI-assisted and is designed to become a reusable front-end template for other Wildbook projects.

## Screenshots

Screenshots will be added after the first Cloudflare preview deployment. The approved screen references live in `design/reference/`.

## Quick start (mock mode)

Requirements: Node 22 or newer and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

If installation reports `ENOTFOUND registry.npmjs.org`, the machine cannot currently reach the npm registry; retry from a network-enabled shell. `npm install --offline` works only after these packages have previously been cached and otherwise reports `ENOTCACHED`.

`MOCK=1` is the development default. It makes every screen browsable without network access or credentials:

- `/` — public photo drop and matching explanation
- `/match/submission-demo` — ranked example match
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
6. Keep `PUBLIC_WRITE=dry-run` until Wild Me approves service-account public writes. When approved, add `WILDBOOK_SERVICE_USER` and `WILDBOOK_SERVICE_PASSWORD`, then explicitly set `PUBLIC_WRITE=live`.
7. Deploy with `npm run deploy`.

Researcher passwords are forwarded to Wildbook’s login endpoint once and are never stored. The Worker stores only the resulting `JSESSIONID` in D1 against an HttpOnly site session.

## Template for another species

The application shell, Wildbook client, D1 store, and workbench are species-agnostic. Species vocabulary and field options are validated from YAML at build time. See [docs/TEMPLATE.md](docs/TEMPLATE.md) for the fork-and-configure guide.

## Current status

Implemented against real interfaces:

- Astro 7 server output on Cloudflare Workers
- Wildbook v3 login, encounter search, encounter/individual reads, media resolution, encounter creation, and match-result reads
- D1 sessions, scar records, encounter review status, and public submissions
- per-species Zod-validated YAML and schema-rendered scar forms

Currently mocked or pending agreement:

- encounter, media, and match fixtures are used when `MOCK=1`
- uploaded image storage is represented by local SVG fixture keys; production object storage is not selected yet
- public writes stay in D1 while `PUBLIC_WRITE=dry-run`
- Wild Me agreement is still needed for service-account public encounter creation
- Wildbook v3 can read computed match results but cannot trigger a match; the production trigger/import workflow remains pending

Architecture and security boundaries are documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

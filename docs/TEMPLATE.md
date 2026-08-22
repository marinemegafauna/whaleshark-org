# Using this as a template for your own Wildbook front end

1. **Fork** the repo. Everything species- or org-specific lives in `species/`, `site.config.ts`, `src/content/`, and `public/brand/`.
2. **Point it at your Wildbook.** Set `WILDBOOK_BASE_URL` (e.g. `https://www.sharkbook.ai`). The v3 API is the same on every Wildbook ≥ 10.12 instance.
3. **Describe your species.** Copy `species/whale-shark.yaml` to `species/<your-species>.yaml`, change the terminology (body regions, injury types, whatever your protocol records) and the labels. The form is generated from the file.
4. **Name your sites** in `site.config.ts` — these are the Wildbook `locationId` values your workbench filters on.
5. **Brand it.** Tokens in `src/styles/tokens.css`; logo and favicon in `public/brand/`.
6. **Deploy** to Cloudflare Workers with `npm run deploy` (needs a D1 database — `npm run db:create` prints the binding to paste into `wrangler.toml`).

Start in `MOCK=1` — the whole site runs on fixtures with no credentials, so you can see every screen before touching a live instance.

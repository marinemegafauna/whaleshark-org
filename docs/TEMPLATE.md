# Using this as a template for your own Wildbook front end

1. **Fork** the repo. Everything species- or org-specific lives in `content/`, `site.config.ts`, and `public/brand/`.
2. **Point it at your Wildbook.** Set `WILDBOOK_BASE_URL` (e.g. `https://www.sharkbook.ai`). The v3 API is the same on every Wildbook ≥ 10.12 instance.
3. **Edit the site text.** `content/site.md` holds the site name, tagline, steward, navigation, research-site labels, footer, and the canonical photo-credit registry. The five files in `content/pages/` hold every page heading, paragraph, label, help message, image path, and alt text. Astro validates their frontmatter during checks and builds.
4. **Describe your species and technical sites.** Copy `content/species/whale-shark.yaml` to `content/species/<your-species>.yaml`, then change its vocabulary and labels; the form is generated from that file. Keep Wildbook `locationId` values and species slugs in `site.config.ts`, and give the matching site ids their display labels in `content/site.md`.
5. **Choose an editing surface.** Edit `content/` directly or point a git-based CMS at it. TinaCMS and Keystatic are tested-shape options for this Markdown/YAML layout, but this repo does not ship either CMS configuration yet. For the MMF maintainer, `scripts/vault_sync.py` is optional Obsidian tooling that reflects the same canonical `content/` files into the vault and safely carries edits back.
6. **Brand it.** Tokens live in `src/styles/tokens.css`; logo and favicon files live in `public/brand/`; page image paths live in `content/pages/`, with their credits keyed by path in `content/site.md`.
7. **Deploy** to Cloudflare Workers with `npm run deploy` (needs a D1 database — `npm run db:create` prints the binding to paste into `wrangler.toml`).

Start in `MOCK=1` — the whole site runs on fixtures with no credentials, so you can see every screen before touching a live instance.

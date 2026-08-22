# Responsive Pages Implementation Plan

> **For agentic workers:** Execute inline in this session. Do not delegate, run `npm install`, or use git write commands.

**Goal:** Make every public and researcher page usable at 390x844 and 768x1024 without changing the approved desktop visual identity.

**Architecture:** Keep each page's existing server-rendered desktop markup, add mobile-only structural alternatives where tabular information must become cards, and use the shared 900px and 560px breakpoints for navigation and layout changes. Add one tested vanilla disclosure helper for the two menu components, retain fractional coordinates as percentage-positioned scar markers, and centralize universal control and image safeguards in the shared tokens stylesheet.

**Tech Stack:** Astro 7, TypeScript, scoped CSS, vanilla browser JavaScript, Vitest.

**Spec:** `/private/tmp/claude-501/-Users-simonjpierce-Library-Mobile-Documents-iCloud-md-obsidian-Documents-Simon-s-Vault/8b7ef8c0-15f9-4c92-8420-342df1538f79/scratchpad/codex-mobile-brief.md`

## Global Constraints

- Work only in `/Users/simonjpierce/repos/whaleshark-org`.
- Preserve the existing Figtree / JetBrains Mono typography, neutral-and-indigo palette, and photo-identification visual language.
- At 390x844 and 768x1024: no page-level horizontal scrolling or clipping; controls are at least 44px tall; body text is at least 14px; captions are at least 12px.
- Do not hide overflow on `body`, add dependencies, use `!important`, run `npm install`, or use git write commands.
- Keep page-specific horizontal scrolling only for the workbench site chip row.
- Finish with `npm test`, `npx astro check`, and `npm run build` passing offline.

---

### Task 1: Shared disclosure navigation and global safeguards

**Files:**
- Create: `src/lib/disclosure-menu.test.ts`
- Create: `src/lib/disclosure-menu.ts`
- Modify: `src/components/PublicHeader.astro`
- Modify: `src/components/AppHeader.astro`
- Modify: `src/styles/tokens.css`

- [x] Write a failing test showing that a disclosure trigger updates `aria-expanded`, menu visibility, and closes after a menu link is chosen.
- [x] Run the focused test and confirm it fails because the helper does not exist.
- [x] Implement the minimal helper and both 900px menu shells with accessible 44px triggers and inline SVG icons.
- [x] Add global 44px control, 16px form-control, and responsive intrinsic-image safeguards.
- [x] Re-run the focused test and refactor only while green.

### Task 2: Public page responsive layouts

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/pages/bulk/index.astro`
- Modify: `src/pages/bulk/[id]/review.astro`
- Modify: `src/pages/match/[id].astro`
- Modify: `src/pages/signin.astro`

- [x] Fix the landing headline with a mobile-safe `clamp()` and balanced wrapping, then audit text, controls, and images.
- [x] Restructure bulk drop, summary, 150px auto-fill tiles, status pills, mobile source order, and safe-area sticky review action.
- [x] Stack review groups before the submit card and expose a safe-area sticky submit action on phones.
- [x] Enforce photo-headline-candidates-actions source order and full-width actions on match results.
- [x] Make sign-in full-width with 20px gutters and 48px inputs.

### Task 3: Researcher workbench mobile alternatives

**Files:**
- Modify: `src/components/SiteRail.astro`
- Modify: `src/pages/app/index.astro`
- Modify: `src/pages/app/encounters/[id]/scars.astro`

- [x] Convert the site rail to a one-row, snap-scrolling chip strip below 900px while keeping desktop stats and schema details.
- [x] Add a mobile encounter card list with the specified fields and 44px full-width scar action while retaining the desktop table at 901px and above.
- [x] Reorder the scar screen to heading, photo, scar cards, form, and a safe-area sticky save/finish bar below 900px.
- [x] Keep stored fractional scar coordinates rendered as percentages at every image size and make form chips wrap with 44px targets.

### Task 4: Documentation and verification

**Files:**
- Modify: `README.md`

- [x] Document the 560px / 900px responsive contract and phone-only structural behaviors.
- [x] Run `npm test` and resolve any failures with regression tests first.
- [x] Run `npx astro check` and resolve all errors.
- [x] Run `npm run build` and inspect the complete result.
- [x] Confirm that live viewport inspection is unavailable in this sandbox, record the exact preview failures below, and complete source/build audits for document overflow, clipping, control sizes, text sizes, menu behavior, and scar-marker alignment.
- [x] Re-read the supplied brief and verify every requirement against the final diff.

## Run note

- In this managed Codex shell, `npx wrangler dev --local --ip 127.0.0.1 --port 8787` cannot provide a browser preview. Wrangler first reports `EPERM` while opening its normal log under `~/Library/Preferences/.wrangler/logs/`, then Miniflare exits because the sandbox denies binding its inspector on `127.0.0.1:9229`. This is the same loopback-policy class already recorded for Astro dev in the earlier bulk-upload plan; do not retry another local server in this environment or misreport the failure as an application defect.
- Importing `dist/server/entry.mjs` or an individual compiled page chunk directly in Node is not a viable serverless-render fallback: the Cloudflare adapter output transitively imports the `cloudflare:` URL scheme, which Node rejects with `ERR_UNSUPPORTED_ESM_URL_SCHEME`. Use a Worker-compatible runtime or a browser-enabled preview outside this sandbox for live viewport QA.
- The browser surfaces do not bypass that listener boundary: the connected Brave extension rejects `http://127.0.0.1:*` with `ERR_BLOCKED_BY_CLIENT`, the in-app browser may be unavailable, and launching headless Brave beside Astro in one managed shell still ends when the harness terminates the listener. After confirming the same `Dev server process exited before becoming ready` marker, stop retrying browser/server combinations and rely on tests, Astro diagnostics, the production build, and a source-level responsive audit until a browser-enabled preview is available.

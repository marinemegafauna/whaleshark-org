# Bulk Upload Implementation Plan

> **For agentic workers:** Execute inline in this session. Do not delegate, run `npm install`, or use git write commands.

**Goal:** Add the approved public bulk-photo matching flow, batch review, and researcher workbench visibility.

**Architecture:** Extend the existing `DataStore` boundary with batch and batch-item records for both the singleton mock store and D1. Keep orchestration in Astro API routes, isolate deterministic mock status advancement in a tested library, and add Wildbook bulk-import calls to the injectable-fetch client. Render all pages server-side and progressively enhance upload previews and polling with small vanilla scripts.

**Tech Stack:** Astro 7, TypeScript, Cloudflare Workers/D1, Vitest, vanilla browser JavaScript.

**Spec:** `/private/tmp/claude-501/-Users-simonjpierce-Library-Mobile-Documents-iCloud-md-obsidian-Documents-Simon-s-Vault/8b7ef8c0-15f9-4c92-8420-342df1538f79/scratchpad/codex-bulk-brief.md`

## Global Constraints

- Work only in `/Users/simonjpierce/repos/whaleshark-org`.
- Follow `src/lib/runtime.ts`, `src/lib/mode.ts`, `src/lib/db.ts`, `src/lib/wildbook.ts`, `BaseLayout`, and the existing page patterns.
- Match `design/reference/BulkUpload.dc.html` faithfully and retain 44px hit targets and reduced-motion safety.
- Use the existing migration sequence: `migrations/0001_init.sql` exists; create `migrations/0002_batches.sql`.
- Do not run `npm install` or git write commands.
- Finish with `npm test`, `npx astro check`, and `npm run build` passing offline.

---

### Task 1: Batch domain, mock state machine, and repository

**Files:**
- Create: `src/lib/batches.ts`
- Create: `src/lib/batches.test.ts`
- Modify: `src/lib/db.ts`
- Modify: `src/lib/db.test.ts`
- Modify: `src/mock/data.ts`
- Create: `migrations/0002_batches.sql`

- [x] Write failing tests for deterministic status advancement and batch/item CRUD.
- [x] Run focused tests and confirm failures are caused by missing batch APIs.
- [x] Implement the smallest typed state machine and memory/D1 repository methods that pass.
- [x] Re-run focused tests and refactor only while green.

### Task 2: Wildbook bulk-import client

**Files:**
- Modify: `src/lib/wildbook.test.ts`
- Modify: `src/lib/wildbook.ts`

- [x] Write failing tests for resumable upload, bulk-import request shape, task polling, and match-result parsing.
- [x] Run focused tests and confirm the expected missing-client failures.
- [x] Implement injectable-fetch calls using the established checked-response and session-header patterns.
- [x] Re-run focused tests and keep parsing defensive.

### Task 3: Batch APIs and public flow

**Files:**
- Create: `src/pages/api/batches/index.ts`
- Create: `src/pages/api/batches/[id]/index.ts`
- Create: `src/pages/api/batches/[id]/items.ts`
- Create: `src/pages/api/batches/[id]/submit.ts`
- Modify: `src/pages/index.astro`
- Create: `src/pages/bulk/index.astro`
- Create: `src/pages/bulk/[id]/review.astro`

- [x] Implement create, item upload, poll, and submit routes through `dataStore(Astro.locals)`.
- [x] Gate real upstream activity with `PUBLIC_WRITE=live`; dry-run stores only local records.
- [x] Add multiple-file transfer from the landing page to `/bulk` using browser-held files and fallback navigation.
- [x] Build the reference-faithful SSR bulk page with progressively enhanced previews, upload, and polling.
- [x] Build grouped review cards with confirm / not sure / none-of-these decisions and batch submit.

### Task 4: Workbench, docs, and verification

**Files:**
- Modify: `src/pages/app/index.astro`
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`

- [x] Add awaiting-batch stats and the mock fixture list to the workbench.
- [x] Document public bulk upload and its mock/live boundary.
- [x] Run `npm test` and resolve failures with regression tests first.
- [x] Run `npx astro check` and resolve all errors.
- [x] Run `npm run build` and inspect the full result.
- [x] Re-read the brief and verify every deliverable against the final diff.

## Run note

- In the managed Codex shell, both `npm run dev -- --host 127.0.0.1` and direct `npx astro dev --host 127.0.0.1 --port 4321` exited before binding a port and emitted only `Dev server process exited before becoming ready` / `SKIP_FORMAT`. This confirms the failure is outside the npm wrapper; do not treat it as a page failure without an application diagnostic, and use the verified production build plus a supported Worker preview or browser-enabled local environment for visual QA.
- When gathering line anchors with `rg`, use separate command invocations for shell-sensitive patterns and bracketed route paths, passing each complete path as one quoted argument. Do not aggregate backtick-bearing patterns or partially quoted `[id]` paths into one multiline zsh command; both forms produced unmatched-quote failures in this run.

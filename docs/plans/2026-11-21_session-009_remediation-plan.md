# Nordhem Furnishing Store — Remediation Plan
**Date:** 2026-11-21 · **Session:** 009 · **Baseline commit:** `aba07e4` (main)

**Inputs:** docs/session_9.md (session-008 record), plan-008, worklog Task 126, fresh audit (web-application + tdd skill methodology; read-only subagent + live curl/agent-browser probes; `skills/` excluded), homenest-store-s stack patterns (unchanged lineage; HSTS parity gap confirmed).

## Baseline (verified this session, all exit-code-checked)
lint 0/0 ✓ · typecheck ✓ · typecheck:tests ✓ · unit 90/90 (14 files) ✓ · build cold ✓ · smoke 21/21 ✓ · e2e 44/44 ✓ · sitemap 275 ✓ · DB 22 categories / 242 products reseeded from a clean rootless PostgreSQL 17 install (`docs/setup_pg_z.sh`). All session-008 fixes re-verified holding live (deep-page canonical → prefix root; unknown → 404; CSP without `data:`; robots disallows; CSRF pairing per smoke).

## Audit summary
**0 CRITICAL · 1 HIGH (dev-surface, found by live browser verification) · 2 MEDIUM · 10 LOW · 7 INFO.** Deferred verdicts: vitest/playwright configs sound — no config changes warranted (standing instruction is a documented no-op, session-007 §15.6 precedent); HSTS **do-now** (homenest parity + register gap); migration journal + CSP nonces do-later; Redis limiter / setCartQuantity LWW / isolate:false never (documented).

## Findings to fix (this session)

| ID | Sev | Finding | Fix |
|---|---|---|---|
| S9-H1 | HIGH | **The CSP header kills the dev server's React runtime.** `script-src 'self' 'unsafe-inline'` (no `unsafe-eval`) is served in `next dev` too; React's development build requires `eval()` → hydration dies → every client island is inert. Live-verified on :3000: Menu button has no React props, drawer never mounts, combobox dead; production :3100 fully functional. Invisible to the e2e gate (runs against the production build) — `npm run dev` (the README quickstart) ships a non-interactive site. | Extract a pure seam `buildSecurityHeaders(nodeEnv)` (`src/lib/security-headers.ts`); `script-src` gains `'unsafe-eval'` **only** when `nodeEnv === "development"`; production policy byte-identical to today's. `next.config.ts` imports the seam (relative path — jiti does not resolve `@/`). RED: new `tests/unit/security-headers.test.ts` (dev has unsafe-eval + prod does not + HSTS present in both). GREEN: the seam + config swap. Live re-probe: dev server Menu button mounts the drawer. |
| S9-M1 | MED | **Paginated canonical diverges from the rendered page.** `generateMetadata` hand-rolls the page clamp (`parseInt \|\| 1`, clamp 1–500) while the body parses `listingQuerySchema` (`.catch(1)`) and `listProducts` clamps to `pageCount`. Traced: `?page=7` (pageCount 6) renders page 6 but canonicalizes `?page=7` (duplicate signal); `?page=999` renders page 1 but canonicalizes `?page=500` (canonical points at different content); `?page=2.7` renders page 1, canonical `?page=2`. Recreates the duplicate surface S8-L2 killed. | One shared `cache()`d loader in `cat/[slug]/page.tsx` (primitive args: slug + raw sort/page/min/max strings so both callers hit the memo entry); canonical derives from `result.page`. Also kills the double `getCategory`+`listProducts` (S9-L3). Product page: `cache()`d `getProductBySlug`. RED: e2e pins on `/cat/lowest-price` — `?page=7` → canonical `?page=6`, `?page=999` → bare `/cat/lowest-price`; `listingCanonicalPath()` unit pin in `src/lib/seo.ts`. |
| S9-M2 | MED | **Rate limiter degrades to O(n) per request and never caps memory once saturated.** `prune` deletes only expired buckets and runs only when `size > MAX_TRACKED_KEYS`; a sustained flood of >5000 live keys makes every `check()` rescan the whole map while it keeps growing. | Evict-when-full: prune expired; if still ≥ cap, delete the oldest-tracked key (Map insertion order, O(1)). Bounded memory, no O(n) per request; an evicted key's next check starts a fresh window (documented under-limit tradeoff, strictly better than unbounded). RED: unit pins (size stays ≤ cap while flooding; eviction observed; normal window behavior unchanged). |
| S9-L1 | LOW | Home page has no canonical and no og:url (every other indexable page has both). | `export const metadata` on `src/app/page.tsx` with `alternates.canonical: "/"` + `openGraph.url: "/"`. e2e pin. |
| S9-L2 | LOW | Sitemap lists 3 deep info URLs whose canonical folds to roots that are NOT sitemapped (`/campaigns/christmas`→`/campaigns`, `/customer-service/services` + `…/return-policy`→`/customer-service`) — sitemap advertises non-canonical URLs. | Swap the 3 deep entries for the 2 canonical roots; `/product-guides/sustainable-products` stays (exact prefix, self-canonical). Sitemap 275→**274**. RED: `docs-counts.test.ts` SITEMAP_URLS 275→274 → GREEN via `sitemap.ts` + doc sweep. |
| S9-L3 | LOW | Every dynamic page runs its data queries twice (`generateMetadata` + page body). | Folded into the S9-M1 shared `cache()`d loaders. |
| S9-L4 | LOW | Buttons outside the `.btn` family lack `cursor: pointer` (Tailwind v4 preflight sets none) — header nav/menu, carousel arrows, hotspot buttons, steppers, toaster dismiss. | `@layer base` rule: `button, [role="button"] { cursor: pointer; }` + `button:disabled { cursor: not-allowed; }`. Pin: globals.css text assertion in the scan-guard suite style. |
| S9-L5 | LOW | Hero hotspot buttons are 32px (`size-8`) — below the 44px WCAG 2.5.8 touch floor, no documented exception. | `size-11` transparent button wrapping the existing `size-8` visual dot (hit area ≥ 44px, visual parity). Pin: e2e bounding-box assertion on the hotspot button. |
| S9-L6 | LOW | SmartImage failure fallback renders `role="img"` with an **empty** `aria-label` when `alt=""` (cart thumbnails, tiles) — axe `role-img-alt` (serious) if a CDN image fails mid-scan. | Fallback renders `role="img" aria-label` only when alt is non-empty; decorative failures render `aria-hidden="true"`. Pin: e2e with `page.route` aborting ikea.com images. |
| S9-L7 | LOW | Scan-guard test doesn't pin the `nordhem-furnishing-store_SKILL.md` exclusion — that guard line could be deleted with the suite green. | Add to `REQUIRED_EXCLUSIONS` (verify the pin bites: temporarily drop the CSS line → RED → restore → GREEN). |
| S9-L8 | LOW | `.env.example` doesn't mirror `MAX_AGE_DAYS` (read by `scripts/prune-abandoned-carts.mjs`). | Add a commented `# MAX_AGE_DAYS=180` row. |
| S9-L9 | LOW | `accessibility-states.spec.ts` pins the suggestions panel to exactly 1 link (breaks on any catalog refresh); `storefront.spec.ts:8` comment says "23 categories" (truth: 22). | Count-independent assertion (≥ 1 + first suggestion contains BILLY) + comment fix. |
| S9-L10 | LOW | `scripts/smoke.sh` executable bit not committed while AGENTS documents direct execution. | `git update-index --chmod=+x scripts/smoke.sh` (verified live: fresh clone needed `chmod +x`). |
| S9-I4 | INFO | `error.tsx` never logs the error (Next recommends `console.error`). | Add `console.error(error)` to the client error boundary. |
| HSTS | do-now | `Strict-Transport-Security` missing from the security headers (present in the homenest reference; the only residual risk not in the known-issues register). | Added in `buildSecurityHeaders` (both dev and prod — ignored over plain HTTP by spec, so dev is unaffected); e2e pin beside the existing header test. |

## Deliberately NOT changed (verdicts recorded)
- **vitest.config.ts / playwright.config.ts** — audited sound (include/exclude never cross-match `*.spec.ts`/`*.test.ts`; webServer production build + health gate; mobile project isolation; sane timeouts; zero skips). The standing "modify the config files" instruction is a **no-op**; the genuine gaps this session are code/content (above), not config — same verdict as sessions 007/008.
- Migration journal (first real schema change), CSP nonces (RSC bootstrap), Redis/shared limiter (single-instance ADR-001), setCartQuantity LWW (accept), vitest `isolate:false` (rejected — risks module-state leakage between files).
- INFO recorded, no action: direct-exposure global buckets (documented tradeoff), e2e/smoke share the dev DB, `/api/health` local try/catch (equivalent), unused tree-shoken theme tokens, dangling `aria-controls` when closed (valid ARIA), tests excluded from lint + no aggregate gate script (boundary choice).

## Execution order (TDD)
1. **S9-H1** security-headers seam RED → GREEN → **live dev-server re-probe** (drawer mounts on :3000 — the fix's own acceptance test).
2. **S9-M1+L3** e2e RED pins (page=7 / page=999 canonicals) → shared `cache()`d loaders GREEN → `listingCanonicalPath` unit pin.
3. **S9-M2** rate-limit eviction unit RED → GREEN.
4. **S9-L2** docs-counts 275→274 RED → sitemap roots GREEN → doc sweep.
5. **S9-L1** home canonical + e2e pin · **HSTS** in seam + e2e pin · **S9-L4** cursor base rule + text pin.
6. **S9-L5** hotspot 44px + box pin · **S9-L6** SmartImage fallback + abort-route e2e · **S9-L9** count-independent suggestion pin + comment.
7. **S9-L7** scan-guard entry (RED-verified by line-drop probe) · **S9-L8** .env.example row · **S9-I4** error.tsx log · **S9-L10** smoke.sh mode bit.
8. Screenshots: parameterize `scripts/capture-screenshots.mjs` BASE (env override) and capture from the **dev server :3000** (the user-facing ask — and the interactive shots 03/04/05 double as live proof the S9-H1 fix works); PIL-validate 12/12.
9. Full gate: lint → typecheck → typecheck:tests → unit (new count) → build cold → smoke 21/21 → e2e (new count) ×3 → sitemap 274.
10. Docs: PAD v2.8.0 revision block + known-issues sweep (HSTS row), SKILL v1.8.0 (§17 lessons + state line), AGENTS/CLAUDE/README/DEPLOYMENT (counts 274, sitemap row, env table, dev-CSP note), worklog Task 127, session_9.md record prepended, plan-009, `.env.example` in the commit.

## Evidence to capture
- S9-H1 RED (unit: dev CSP lacks unsafe-eval today — no seam exists) → GREEN; live :3000 probe — `hasReactProps` true, drawer opens, search suggests (pre-fix: all false/dead, captured this session).
- S9-M1 RED: `/cat/lowest-price?page=7` canonical says `?page=7` (wrong) pre-fix → `?page=6` post-fix; `?page=999` → bare canonical post-fix.
- S9-M2 RED: flooding 5000+ keys leaves size unbounded pre-fix → capped + evicting post-fix.
- S9-L2 RED: docs-counts 275 pin vs new 274 reality → GREEN sweep.
- Full gate exit codes; sitemap 274; screenshots 12/12 PIL-valid from the dev server; DB untouched (no reseed needed — no seed changes).

# Nordhem Furnishing Store — Remediation Plan
**Date:** 2026-11-21 · **Session:** 010 · **Baseline commit:** `c2063fa` (main)

**Inputs:** docs/session_10.md (session-009 raw record), plan-009, worklog Task 127, fresh audit (web-application + tdd skill methodology; read-only subagent; `skills/` excluded; deep pass over the session-009 changeset), homenest-store-s stack patterns (unchanged lineage).

## Baseline (verified this session, all exit-code-checked)
lint 0/0 ✓ · typecheck ✓ · typecheck:tests ✓ · unit 102/102 (16 files) ✓ · build cold ✓ · e2e 49/49 ✓ · smoke 21/21 ✓ · sitemap 274 ✓ · HSTS live ✓ · DB intact from the surviving data dir (22 categories / 242 products; PG restarted via `docs/setup_pg_z.sh`). All session-009 fixes re-verified holding live — including the dev server on BOTH origins (drawer mounts via 127.0.0.1 AND localhost).

## Audit summary
**0 CRITICAL · 0 HIGH · 2 MEDIUM · 4 LOW · 4 INFO.** Both MEDIUMs are in the session-009 changeset itself (the audit's focused re-review of e67b703): a metadata-merge regression on the home page and a vacuous e2e pin. Deferred verdicts unchanged: migration journal / CSP nonces / Redis limiter all **do-later**. Test-config instruction: vitest/playwright configs audited sound for the third consecutive session — **documented no-op**.

## Findings to fix (this session)

| ID | Sev | Finding | Fix |
|---|---|---|---|
| S10-M1 | MED | **Home page `openGraph` export REPLACES the layout's openGraph** (verified in Next 16.4.2 `mergeMetadata`: page-level og is resolved wholesale — only title/description/images are backfilled). S9-L1's `openGraph: { url: "/" }` silently dropped `og:type="website"` and `og:site_name` from the site's most-shared URL and changed the og:title wording. The S9 e2e pin only asserted og:url, so it shipped invisibly. | Full og block in the home page metadata: `url: "/", type: "website", siteName: "Nordhem Furnishing Store"` + the short og title/description the layout carried. RED: e2e pins `og:type=website` + `og:site_name` on `/` (fails today). GREEN: the metadata fix. |
| S10-M2 | MED | **The SmartImage e2e pin (S9-L6) can pass vacuously** — it only asserts zero nameless `role="img"` divs; if no fallback renders at all (all images failing pre-hydration, the documented gap) it proves nothing. Deleting the conditional from smart-image.tsx would still pass. Duplicated comment lines; fixed `waitForTimeout`. | Positive pin: scroll the related-products carousel into view — lazy images request AFTER hydration, so onError IS attached and fallback divs genuinely render. `expect.poll` for ≥1 `div[aria-hidden="true"].bg-surface` fallback + keep the nameless-role pin. Pin-bite verified by reverting the conditional → RED → restore. |
| S10-L1 | LOW | **Rate-limit eviction can evict the caller's own key mid-check** (victim chosen before `buckets.get(key)` — a blocked client at capacity unblocks itself) and renewed keys never refresh insertion order (a steady consumer is always the first victim under flood). | `oldest !== key` guard + delete-then-reinsert on window renewal. RED: unit pin for the self-eviction case + renewal-reorder case. GREEN: the fix. |
| S10-L2 | LOW | The "O(1)" claim in rate-limit.ts (and the session-009 commit message) is inaccurate — at sustained capacity `prune` still scans all ≤5000 buckets per request. | Correct the comment to "bounded O(MAX_TRACKED_KEYS) prune + O(1) eviction" (algorithm unchanged — microseconds, correctness/simplicity over premature optimization; documented). |
| S10-L3 | LOW | The two next.config.ts source-text pins (seam import, allowedDevOrigins) are implementation-coupled — they break on formatting refactors and can't see a competing `headers()` override. | Keep them (behavior is covered by the production-CSP e2e pin + live dev probes) but annotate the coupling explicitly so a future refactor knows they are tripwires, not behavior tests. |
| S10-L4 | LOW | The sitemap DB-outage degrade pin is a `try/catch` regex — a degrade path returning `[]` would pass. The checkout-lock containment pins are the same family (documented tradeoff). | Extract the sitemap's static+info route list into an exported pure constant consumed by `sitemap.ts`; assert the degrade set directly in seo-routes.test.ts. Checkout-lock: add the tradeoff comment (full extraction deferred — the tx body refactor is out of scope). |
| S10-I1 | INFO | `BASE` env override (capture-screenshots.mjs) not mirrored in `.env.example` — the env-contract mirror claim is one entry short. | Add a commented row. |
| S10-I2 | INFO | An explicit `NODE_ENV=development next build` is respected by Next (with a warning) — the dev CSP (unsafe-eval) would leak into that build; symmetrically `NODE_ENV=production npm run dev` re-breaks dev hydration. Plain commands are all correct; the e2e pin backstops a polluted build. | DEPLOYMENT.md note: never set NODE_ENV manually; the seam keys off it. |
| S10-I3 | INFO | `MAX_TRACKED_KEYS = 5000` mirrored as a literal in the eviction test ("must mirror" comment) — a cap change fails with a size mismatch, not a clear message. | Export `MAX_TRACKED_KEYS` from rate-limit.ts; import it in the test. |
| S10-I4 | INFO | Catch-all `generateMetadata` calls `resolveInfoPage` without the `isKnownInfoPath` gate the body uses — a 404 response can carry a canonical for a nonexistent URL (harmless — 404s aren't indexed — but the paths disagree). | Gate generateMetadata on `isKnownInfoPath`. RED: e2e pin — unknown path → 404 AND no canonical link. GREEN: the gate. |

## Deliberately NOT changed (verdicts recorded)
- **vitest.config.ts / playwright.config.ts** — audited sound (third consecutive session); the standing "modify the config files" instruction remains a documented no-op.
- Migration journal (adopt at first production DB), CSP nonces (before real user data), Redis limiter (multi-instance only) — do-later. Checkout-lock tx-body extraction — deferred with comment. Pre-hydration image-failure onError gap — accepted (documented; the new positive pin targets the post-hydration path that DOES fire).

## Execution order (TDD)
1. **S10-M1** e2e RED (og:type/og:site_name on `/`) → home metadata fix → GREEN.
2. **S10-M2** rework the SmartImage e2e into a real positive pin (scroll-to-lazy + expect.poll); pin-bite verified by conditional-revert probe.
3. **S10-L1** unit RED (self-eviction + renewal-reorder) → guard + reinsert → GREEN. **S10-L2** comment correction. **S10-I3** constant export.
4. **S10-L4** sitemap route-list extraction + direct degrade assert. **S10-L3** pin-coupling annotations. **S10-I4** catch-all gate + e2e RED→GREEN.
5. **S10-I1/I2** .env.example BASE row + DEPLOYMENT NODE_ENV note.
6. Full gate: lint → typecheck → typecheck:tests → unit → build cold → smoke → e2e ×3 → sitemap 274 (unchanged).
7. Screenshots from the dev server (BASE override) — 12/12 PIL-valid; .env.example verified complete.
8. Docs: PAD v2.9.0 revision block, SKILL v1.9.0 (§18 lessons + state line), AGENTS/CLAUDE/README/DEPLOYMENT counts if changed, worklog Task 128, session_10.md record prepended, plan-010.

## Evidence to capture
- S10-M1 RED: `/` serves no og:site_name (live `curl` pre-fix) → GREEN post-fix (og:type=website, og:site_name restored).
- S10-M2 pin-bite: revert the smart-image conditional → the new positive pin fails → restore → passes.
- S10-L1 RED: self-eviction unit case (blocked client unblocks at capacity) fails pre-fix.
- S10-I4 RED: unknown path 404 carries a canonical pre-fix → none post-fix.
- Full gate exit codes; sitemap 274; screenshots 12/12 from the dev server; DB untouched (no reseed).

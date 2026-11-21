# Nordhem Furnishing Store — Remediation Plan
**Date:** 2026-11-21 · **Session:** 011 · **Baseline commit:** `14dc8db` (main)

**Inputs:** docs/session_11.md (session-010 raw record), plan-010, worklog Task 128, fresh audit (web-application + tdd methodology; read-only subagent; `skills/` excluded; deep pass over the session-010 changeset f22a819).

## Baseline (verified this session, all exit-code-checked)
lint 0/0 ✓ · typecheck ✓ · typecheck:tests ✓ · unit 105/105 (16 files) ✓ · build cold ✓ · e2e 50/50 ✓ · smoke 21/21 ✓ · sitemap 274 ✓ · DB intact from the surviving PG data dir (22 / 242; PG restarted via `docs/setup_pg_z.sh`). Dev server re-verified live on BOTH origins (drawer state machine, Escape/focus, desktop clean). No Tailwind v4 bug.

## Audit summary
**0 CRITICAL · 0 HIGH · 1 MEDIUM · 2 LOW · 4 INFO.** The MEDIUM is the SAME openGraph-replace bug class session-010 fixed on `/` — still live on **product pages** (the only other page-level og export in `src/app`): the partial og block (title/description/images) silently drops `og:type` and `og:site_name` (verified in the installed Next 16.4.2 merge/emission code; live-confirmed: `/p/billy-*` serves none of og:type/og:site_name/og:url). Deferred verdicts: migration journal do-later · CSP nonces never (threat model) · Redis limiter do-later. Config instruction: vitest/playwright audited sound — **documented no-op** (fourth consecutive session).

## Findings to fix (this session)

| ID | Sev | Finding | Fix |
|---|---|---|---|
| S11-M1 | MED | **Product pages' partial page-level openGraph REPLACES the layout's og** — `og:type`/`og:site_name` dropped (and no explicit og:url) on every `/p/*` page; the S10-M1 fix was applied only to `/`. Product pages are the most-shared URLs in e-commerce. | Full og set in `p/[slug]` generateMetadata: `url: /p/${slug}`, `type: "website"`, `siteName` alongside title/description/images. RED: extend the e2e "product page exposes og:image" test to pin og:type + og:site_name (live-confirmed absent today). GREEN: the metadata fix. |
| S11-L1 | LOW | The SmartImage e2e's fixed 2500 ms abort delay is a hydration-speed bet — on a CI-slow machine the eager image could still fail pre-hydration and the test false-fails (flake, not vacuity). | Raise the delay to 4500 ms (both fallback shapes appear by ~5–6 s, well inside the 15 s poll); update the comment. |
| S11-L2 | LOW | **Doc/code drift:** DEPLOYMENT.md's rate-limit table claims `GET /api/cart` is limited 120/min, but GET has no `limiter.check` — an unauthenticated, DB-touching, unlimited read. | Code-wins-in-favor-of-the-doc: add the limiter to GET (the documented posture is the better one — it is an unthrottled unauthenticated DB read otherwise). Pin via a new `tests/unit/api-surface.test.ts` source-tripwire (the accepted checkout-lock pattern, honestly annotated). Smoke/e2e unaffected (they make ~5 GETs, limit 120/min). |
| S11-I1 | INFO | rate-limit.ts: (a) the eviction-guard comment overstates ("another victim always exists" — when the caller's own key is oldest at an all-live full map, eviction is correctly *skipped*; the set() below replaces in place and the bound holds); (b) the fresh-window branch (`buckets.set` on an expired key) preserves the key's ORIGINAL insertion position, so a returning key keeps its ancient queue position despite a fresh window. | (a) Reword the comment to state the skip-is-safe semantics. (b) delete+reinsert in the fresh-window branch. RED: unit pin — a returning key must not be the eviction victim (distinguishing sequence designed: limit-2 window-expiry-return, flood to cap, the follow-up check must be blocked post-fix / allowed pre-fix). |
| S11-I2 | INFO | Category pages share the layout's generic og (correct merge, nothing dropped — but sharing a category URL shows the store name, not "Sofas & armchairs"). | Same full-set pattern as S11-M1 for `cat/[slug]` generateMetadata: `url` = the already-computed paginated canonical, `type`, `siteName`, `title` = category name, `description` = the meta description. RED: new e2e test pinning og:title + og:type + og:site_name on a category page. |
| S11-I3 | INFO | The dev-half of S9-H1 (allowedDevOrigins) has no automated gate — observation only; the tripwire NOTE comment is accurate and live probes (screenshots from the dev server) cover it. | **No action** (documented). |
| S11-I4 | INFO | docs-counts' per-doc DOCS regex table is partially dead (only the stale-pattern sweep consumes it). | **No action** (harmless duplication; the lockstep mechanism is the per-doc inline assertions — restructuring it risks the very drift it prevents). |

## Deliberately NOT changed (verdicts recorded)
- **vitest.config.ts / playwright.config.ts** — audited sound (fourth consecutive session); standing instruction remains a documented no-op.
- Migration journal (do-later), CSP nonces (never for this threat model), Redis limiter (do-later, single-instance by design), checkout-lock text-pin tradeoff (documented), pre-hydration image-failure fallback in production (accepted; the e2e delays aborts to test the post-hydration path).
- Info pages (`[...slug]`) keep the layout's og — correct merge, low-traffic policy pages; recorded as accepted.

## Execution order (TDD)
1. **S11-M1 + S11-I2** e2e RED (product og pins extended; new category og test) → run against the current build → RED → metadata fixes → rebuild → GREEN.
2. **S11-I1** unit RED (fresh-window reorder pin) → apply the reword + delete/reinsert → GREEN.
3. **S11-L2** api-surface tripwire test (GREEN-only pin on the new source; the limiter change lands with it) + **S11-L1** delay bump.
4. Full gate: lint → typecheck → typecheck:tests → unit → build cold → smoke → e2e ×3 → sitemap 274 (unchanged).
5. Screenshots from the dev server (BASE override) — 12/12 PIL-valid; `.env.example` verified complete (audit: matches every process.env read).
6. Docs: PAD v2.10.0 revision block, SKILL v1.10.0 (§19 lessons + state line), AGENTS/CLAUDE/README counts (106/17 unit files, 51 e2e), worklog Task 129, session_11.md record, plan-011, docs-counts constants.

## Evidence to capture
- S11-M1 RED: live `curl` — `/p/billy-*` serves no og:type/og:site_name (captured) → GREEN post-fix.
- S11-I1 RED: the returning-key pin fails pre-fix (distinguishing blocked/allowed at the 4th check).
- Full gate exit codes; sitemap 274; screenshots 12/12 from the dev server; DB untouched (no reseed).

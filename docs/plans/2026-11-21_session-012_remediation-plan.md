# Nordhem Furnishing Store — Remediation Plan
**Date:** 2026-11-21 · **Session:** 012 · **Baseline commit:** `b5dfb2f` (main)

**Inputs:** docs/session_12.md (session-011 raw record), plan-011, worklog Task 129, fresh audit (web-application + tdd methodology; read-only subagent; `skills/` excluded; deep pass over the session-011 changeset d03a442).

## Baseline (verified this session, all exit-code-checked)
lint 0/0 ✓ · typecheck ✓ · typecheck:tests ✓ · unit 107/107 (17 files) ✓ · build cold ✓ · e2e 51/51 ✓ · smoke 21/21 ✓ · sitemap 274 ✓ · DB intact from the surviving PG data dir (22 / 242; PG restarted via `docs/setup_pg_z.sh`). Dev server re-verified live on BOTH origins (drawer state machine, Escape/focus, desktop clean). No Tailwind v4 bug.

## Audit summary
**0 CRITICAL · 0 HIGH · 0 MEDIUM · 2 LOW · 6 INFO.** All session-011 changes verified correct (og full-set merge semantics traced in the installed Next 16.4.2; the staggered-clock eviction pin's arithmetic traced exactly; every doc-claim count statically recounted). The two LOWs: (L1) `GET /api/summary` is the last unthrottled, unauthenticated, DB-touching read — the S11-L2 class, and doc/code AGREE it is unlimited, but the posture is inconsistent (health is a `select 1` probe; summary runs two indexed queries per call); (L2) the api-surface tripwire's regex is formatting-dependent (a one-line GET refactor + dropped limiter would make the lazy match span into POST and pass vacuously). Deferred verdicts unchanged: migration journal do-later · CSP nonces never · Redis limiter do-later. Config instruction: vitest/playwright audited sound — **documented no-op** (fifth consecutive session).

## Findings to fix (this session)

| ID | Sev | Finding | Fix |
|---|---|---|---|
| S12-L1 | LOW | **`GET /api/summary` — unthrottled, unauthenticated, DB-touching read.** Every call runs `sum(cart_items.quantity)` + a favourites scan keyed on a client-supplied cookie, with no cap at all (DEPLOYMENT documents it "unlimited (probe/read paths)" — no drift, but health is a `select 1` while summary is not a probe). The exact surface S11-L2 closed for cart GET. | Apply the cart-GET pattern: `createRateLimiter({ limit: 120, windowMs: 60_000 })` + `clientKey(request)` + `rateLimited(limit)`; update the DEPLOYMENT row (health stays unlimited as a true probe; summary becomes 120/min). RED: new api-surface tripwire test (fails today). Smoke/e2e make ~5 summary calls — ample margin. |
| S12-L2 | LOW | **api-surface tripwire regex is formatting-dependent.** `/export function GET\([^)]*\)\s*\{[\s\S]*?\n\}/` stops at the first column-0 `}`; today that is GET's own closer, but a one-line `GET` refactor plus a dropped limiter would let the match run on to POST's closer and pass on POST's limiter — a vacuous pass exactly when the guard is removed. | Structural slice: `src.indexOf("export function GET")` → `src.indexOf("export function POST")` (or end-of-file), assert `limiter.check` inside the slice. Bites by construction regardless of formatting. |
| S12-I2 | INFO | **Category og ships no og:image** while product pages carry one; `categories.image` already holds nav-tile URLs (21/22 non-null in the seed corpus — the block must be conditional). | `...(data.category.image ? { images: [imageUrl(data.category.image, "l")] } : {})` in the cat-page og block; extend the category-og e2e test with an og:image pin (RED — live-verified 0 og:image on `/cat/sofas-armchairs-700640` today). |
| S12-I3 | INFO | rate-limit eviction-guard comment: "the set() below replaces it in place (the map stays at exactly MAX)" is imprecise on the blocked path (there is no set — the check returns without inserting; the bound holds either way). | One clause: "…or the check returns blocked without inserting". |
| S12-I4 | INFO | **The mobile drawer reopens with the Products submenu still expanded** — `mobileProductsOpen` lives in the parent while the drawer conditionally unmounts, so the flag survives close/reopen (live-confirmed: `aria-expanded="true"` after Escape-close + reopen; expected `false` on a fresh open). No a11y violation (aria-expanded stays truthful). | `useEffect(() => { if (panel !== "mobile") setMobileProductsOpen(false); }, [panel])` — resets on every close path (Escape, outside-click, close button, link navigation). RED: new mobile-navigation e2e test. |
| S12-I5 | INFO | `.gitignore` lacks `*.log` — latent only (worktree clean today), but a future `dev.log` would land commit-able. | Add `*.log` under the hygiene block. |
| S12-I6 | INFO | `/api/cart`'s four methods share ONE 120/min budget per client key; the DEPLOYMENT row reads as if per-method. | Clarify the row: "120/min combined across methods, per client". |
| S12-I1 | INFO | Session-011's commit message claimed smoke/e2e make "~5 GETs" of `/api/cart` — actually **zero** (smoke reads cart state via `/api/summary`; the site's own client never GETs `/api/cart`). Harmless (erred conservative); recorded here for accuracy. | No action — corrected in this plan and the session record. |

## Deliberately NOT changed (verdicts recorded)
- **vitest.config.ts / playwright.config.ts** — audited sound (fifth consecutive session); the standing instruction remains a documented no-op.
- Migration journal (do-later), CSP nonces (never for this threat model), Redis limiter (do-later), checkout-lock text-pin tradeoff, pre-hydration image-failure fallback, info pages keeping the layout's og, docs-counts DOCS-table duplication, allowedDevOrigins manual-probe coverage — all documented, unchanged.
- Sitemap/SEO: 274 verified; the S12-I2 og:image addition is a pure enhancement (no URL changes).

## Execution order (TDD)
1. **RED batch:** api-surface rework (structural slice; cart stays green — hardening) + NEW summary tripwire (RED) · category-og e2e og:image pin (RED) · NEW drawer-submenu-reset e2e test (RED). Verify each RED.
2. **GREEN batch:** summary limiter (L1) · cat-page conditional og:image + `imageUrl` import (I2) · header reset effect (I4) · rate-limit comment clause (I3) · `.gitignore` `*.log` (I5) · DEPLOYMENT rows (L1 summary + I6 combined wording).
3. Full gate: lint → typecheck → typecheck:tests → unit (108/17 expected) → build cold → smoke → e2e ×3 (52/5 expected) → sitemap 274 (unchanged).
4. Screenshots from the dev server (BASE override) — 12/12 PIL-valid; `.env.example` re-verified (no new env vars this session).
5. Docs: PAD v2.11.0 revision block, SKILL v1.11.0 (§20 lessons + state line), AGENTS/CLAUDE/README counts (108/17, 52), worklog Task 130, session_12.md record, plan-012, docs-counts constants.

## Evidence to capture
- S12-L1 RED: api-surface summary test fails pre-fix (no limiter in summary route) → GREEN post-fix.
- S12-I2 RED: live `curl` — 0 og:image on `/cat/sofas-armchairs-700640` (captured) → GREEN post-fix.
- S12-I4 RED: live agent-browser — `aria-expanded="true"` on reopen (captured) + e2e RED → GREEN.
- Full gate exit codes; sitemap 274; screenshots 12/12 from the dev server; DB untouched (no reseed).

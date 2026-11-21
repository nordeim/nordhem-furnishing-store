# Nordhem Furnishing Store — Remediation Plan
**Date:** 2026-11-21 · **Session:** 013 · **Baseline commit:** `1bf5db8` (main)

**Inputs:** docs/session_13.md (session-012 raw record), plan-012, worklog Task 130, fresh audit (web-application + tdd methodology; read-only subagent; `skills/` excluded; deep pass over the session-012 changeset 7d51eed).

## Environment note (workspace RESET, fully recovered)
The sandbox was recycled before this session: the repo clone, node_modules, `.env` and the Playwright 1255 browser builds were lost; the PG root tree, data dir, `bin/ssh` shim, scripts/ and the homenest reference clone survived. Recovery: fresh `git clone` (at `1bf5db8` — operator doc-only, adds `docs/session_13.md`), `npm install` (lockfile clean, zero drift), `.env` recreated from `.env.example`, `npx playwright install chromium` (restored the 1255 builds the lockfile's playwright 1.65.1 needs), and **the PG data dir repaired in place** — the reset had pruned only its *empty* subdirectories (`pg_notify`, `pg_stat`, `pg_logical/snapshots`, `pg_multixact/*`, …), which were recreated with mode 700; the server then recovered cleanly and the data verified intact (22 / 242 — **no reseed**).

## Baseline (verified this session, all exit-code-checked)
lint 0/0 ✓ · typecheck ✓ · typecheck:tests ✓ · unit 108/108 (17 files) ✓ · build cold ✓ · e2e 52/52 ✓ · smoke 21/21 ✓ · sitemap 274 ✓. Dev server re-verified live on BOTH origins (drawer machine; the S12-I4 submenu reset holding; Escape/focus/scroll; desktop clean). No Tailwind v4 bug.

## Audit summary
**0 CRITICAL · 0 HIGH · 2 MEDIUM · 2 LOW · 3 INFO.** All nine session-012 change-areas verified correct (limiter placement, structural slice semantics incl. the `slice(1)` self-match guard, conditional og:image, the reset effect traced through every close path, doc rows, both new e2e pins). Deferred verdicts unchanged: migration journal do-later · CSP nonces never · Redis limiter do-later. Config instruction: vitest/playwright audited sound — **documented no-op** (sixth consecutive session).

## Findings to fix (this session)

| ID | Sev | Finding | Fix |
|---|---|---|---|
| S13-M1 | MED | **Unbounded `optionalDollars` transform 500s every listing/search page.** The transform validates the *dollar* value is finite/non-negative but never bounds the *cent* output: `?max=1e308` → `Math.round(1e308*100)` = `Infinity`; `?max=1e17` → `1e19` cents (> int8 max). These flow straight into `gte/lte(products.priceCents, …)` and the Postgres bind fails → HTTP 500, violating the schema's documented contract ("bad values fall back to defaults instead of erroring"). **Live-confirmed this session: `?max=1e308` on `/cat/sofas-armchairs-700640` → 500; `?max=1e17` on `/search?q=billy` → 500.** Reachable by URL crafting AND by the Max-price number input (HTML accepts `1e308` notation). The sibling `page` param is correctly bounded (`min(1).max(500).catch(1)`) — only min/max are not. | Bound the cents: `const cents = Math.round(parsed * 100); return Number.isSafeInteger(cents) && cents <= 2_147_483_647 ? cents : undefined;` (int32 ceiling — comfortable headroom over the seeded corpus, safe for JS and the column). RED: new validation unit it with `"1e308"`, `"1e17"` → `undefined`, plus boundary pins `"21474836.47"` → 2147483647 (stays valid) and `"21474836.48"` → `undefined`. Live GREEN: both URLs → 200. |
| S13-M2 | MED | **DEPLOYMENT.md §10 gate counts are stale** (90 unit / 14 files / 44 e2e — session-008 era; reality 108 / 17 / 52), and the docs-counts census does not cover DEPLOYMENT.md — the exact "count-claims drift independently across documents" failure the lockstep mechanism exists to prevent. | Update the two §10 lines to 108/17 and 52; **add DEPLOYMENT.md to the census** (DOCS array + a per-doc it asserting the counts) so it can never drift again. RED: the new per-doc it fails against the stale text → GREEN after the doc fix. |
| S13-L1 | LOW | **DEPLOYMENT.md §1 self-contradicts §8 and the code**: says "four security headers … **no HSTS** (set it at the TLS edge)" while the seam has emitted six headers including HSTS since session-009 and §8 of the same document correctly documents it. | Reword §1 to the six-header truth (incl. HSTS) and refresh the section's revision marker to session-013. |
| S13-L2 | LOW | **The drawer stays "open" (scroll-lock + focus trap) when the viewport crosses the lg breakpoint** — the drawer is hidden via `lg:hidden`, not unmounted, so `panel` stays `"mobile"` and `body.overflow=hidden` + the Tab trap remain while no drawer is visible. **Live-confirmed this session: opened at 390px, crossed to 1440px → drawer still in DOM, `overflow: hidden`, trap live; only Escape recovers.** | `matchMedia("(min-width: 1024px)")` change listener (active while `panel === "mobile"`) that calls `setPanel(null)` when the breakpoint is crossed upward — reusing the existing close path so the scroll-lock cleanup and the S12-I4 reset effect both fire. RED: new e2e test (open at mobile → `setViewportSize(1280×800)` → drawer unmounted + scroll unlocked). |
| S13-I2 | INFO | Cosmetic script nits: a stray extra indent in `capture-screenshots.mjs:26`; `//`-style comments inside a `/** */` block in `prune-abandoned-carts.mjs:14-15`. | Fix both (zero functional risk). |
| S13-I1 | INFO | E2E traffic draws from the same 120/min "unknown" summary bucket on the reused :3100 server (~65 full loads/run; benign today — no e2e asserts summary-badge state; the direct-exposure posture is documented). | **No action** (documented). |
| S13-I3 | INFO | Source-text tripwires remain implementation-coupled by design (each honestly annotated, behavior delegated to smoke/e2e). | **No action** (accepted design). |

## Deliberately NOT changed (verdicts recorded)
- **vitest.config.ts / playwright.config.ts** — audited sound (sixth consecutive session); the standing instruction remains a documented no-op.
- Migration journal (do-later), CSP nonces (never for this threat model), Redis limiter (do-later), checkout-lock text-pin tradeoff, pre-hydration image-failure fallback, info pages keeping the layout's og, docs-counts DOCS-regex duplication, allowedDevOrigins manual-probe coverage — all documented, unchanged.
- Sitemap/SEO: 274 verified; no URL changes this session.

## Execution order (TDD)
1. **RED batch:** validation overflow it (RED — current code returns Infinity/1e19 cents) · docs-counts DEPLOYMENT census extension (RED — 90/14/44 stale) · e2e lg-breakpoint test (RED — drawer stays mounted). Verify each RED.
2. **GREEN batch:** optionalDollars bound (M1) · DEPLOYMENT §1 + §10 + revision marker (L1+M2) · header matchMedia effect (L2) · script nits (I2).
3. Full gate: lint → typecheck → typecheck:tests → unit (110/17 expected) → build cold → smoke → e2e ×3 (53/5 expected) → sitemap 274 → live 200s on the two 500-URLs.
4. Screenshots from the dev server (BASE override) — 12/12 PIL-valid; `.env.example` re-verified (no new env vars this session).
5. Docs: PAD v2.12.0 revision block, SKILL v1.12.0 (§21 lessons + state line), AGENTS/CLAUDE/README counts (110/17, 53), worklog Task 131, session_13.md record, plan-013, docs-counts constants.

## Evidence to capture
- S13-M1 RED: live 500s on both URLs (captured) + unit RED → GREEN (live 200s).
- S13-M2 RED: docs-counts per-doc it vs stale 90/14/44 → GREEN.
- S13-L2 RED: live DOM evidence (captured) + e2e RED → GREEN.
- Full gate exit codes; sitemap 274; screenshots 12/12 from the dev server; DB untouched (no reseed).

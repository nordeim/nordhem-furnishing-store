# Nordhem Furnishing Store — Remediation Plan
**Date:** 2026-11-20 · **Session:** 002 · **Baseline commit:** `006e30a` (main)
**Inputs:** session-001 docs (AGENTS/CLAUDE/README/PAD/SKILL, docs/session_1.md, plans/2026-11-20_session-001), fresh audit (web-application skill + code-review skill methodology, skills/ excluded from checking), homenest-store-s patterns.

## Baseline (verified this session)
lint ✓ · typecheck ✓ · typecheck:tests ✓ · unit 52/52 ✓ · build ✓ · smoke 19/19 ✓ · e2e 17-18/18 with a measured ~30-50% flake in one test. Doc alignment: all session-001 claims verified true (guard, scripts, SEO routes, test counts) EXCEPT the sitemap coverage claim (H1 below).

## Audit summary
0 CRITICAL · 3 HIGH · 5 MEDIUM · 10 LOW. Core commerce (checkout transaction, money math, validation, ILIKE escaping, PII hygiene, guard coverage, zero classList) — CLEAN.

## Findings to fix (this session)

| ID | Sev | Finding | Fix |
|---|---|---|---|
| H1 | HIGH | Sitemap lists only page 1 (24/242 products); code comment + PAD row claim "every product fits the first page" — false at 242 | `listAllProductSlugs()` in catalog.ts (id+slug select, no pagination); sitemap maps all; fix comment + PAD; pin with a unit test |
| H2 | HIGH | `clientKey` trusts the FIRST `x-forwarded-for` hop — client-spoofable in every posture; defeats all rate limiters incl. the order-probing brake | Rightmost-hop semantics with `TRUSTED_PROXY_DEPTH` env (default 1); fail-closed to "unknown" when depth exceeds hops; unit-test the parsing |
| H3 | HIGH | e2e "product page carries Product JSON-LD" clicks the aria-hidden image link then reads scripts before navigation → ~40% flake (measured) | Click a visible card-title link, `waitForURL(/\/p\//)`, then read scripts |
| M1 | MED | `readJson` reads unbounded bodies, no Content-Type gate | Reject non-`application/json` Content-Type; 16 KB body cap |
| M2 | MED | storefront.spec product-page test can silently false-pass against the home page (same first-link pattern; sr-only h1 satisfies the heading assert) | Title-link click + `toHaveURL(/\/p\//)` + product-specific assertion (Article no.) |
| M4 | MED | No unit tests for `http.ts` (hasForeignOrigin/clientKey/readJson), `session.ts` UUID gate, `jsonLdScript` escaping | `tests/unit/http.test.ts` + seo escaping test (RED first) |
| M5 | MED | Session cookie `secure` only when `x-forwarded-proto=https` — direct-HTTPS deploys emit non-Secure cookies | `secure: proto==="https" || NODE_ENV==="production"` |
| L2 | LOW | `order_items.order_id` FK unindexed | Add index + `drizzle-kit push` |
| L3 | LOW | playwright-report/ + test-results/ git-tracked, dirtied every run | .gitignore + `git rm --cached` |
| L4 | LOW | pg Pool has no `error` handler — pool-level error crashes the process | `pool.on("error", ...)` structured log |
| L5 | LOW | `ensureSummaryLoaded` never retries after a failed /api/summary | Set the loaded flag on success only |
| L7 | LOW | Product page re-implements JSON-LD escaping inline (untested duplicate of `jsonLdScript`) | Import the tested helper |
| L9 | LOW | Every category breadcrumb's "Products" links to the Storage category | Drop the misleading middle crumb |
| L10 | LOW | Search box keeps stale suggestions on non-OK response | Clear results on `!response.ok` |

## Deferred (documented, not fixed this session)
- M3 dialog focus-trap / hotspot popover a11y — a UI change needing visual verification; deferred to next session
- L1 first-request session race — narrow, self-healing; documented
- L6 unused icons/tokens — design-system palette, keep deliberately
- L8 `!p-0` legacy prefix form — verified still compiling; opportunistic later
- CSP header, migration journal — standing known issues in PAD §10

## Execution order (TDD)
1. Unit tests RED: http.test.ts (clientKey hops, hasForeignOrigin, readJson gates) + seo escaping + sitemap coverage pin
2. Implement lib fixes (http, seo usage, catalog.listAllProductSlugs, sitemap, session secure, shopping-store retry, search-box, db pool + index)
3. e2e spec fixes (seo-platform H3, storefront M2)
4. drizzle-kit push (order_items index) + gitignore sweep
5. Full gate: lint → typecheck → typecheck:tests → test → build → smoke → e2e ×3 runs (flake check)
6. Browser verification (mobile nav interactive pass) + screenshots refresh
7. Docs sweep (counts, PAD known-issues, H1/H2 truth fixes) + worklog Task 120 + SKILL refresh
8. Commit + SSH push to main

## Evidence to capture
- Unit run counts (before/after), e2e 18/18 across 3 consecutive runs
- Sitemap loc count = 2 + 23 + 242 = 267 (curl)
- robots unchanged; new unit tests green

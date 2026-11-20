# Nordhem Furnishing Store — Remediation Plan
**Date:** 2026-11-20 · **Session:** 003 · **Baseline commit:** `c3852cb` (main)
**Inputs:** docs/session_2.md, worklog Tasks 112/119/120, plans/session-002, fresh audit (web-application skill methodology; skills/ excluded). homenest-store-s patterns re-checked where relevant.

## Baseline (verified this session)
lint ✓ · typecheck ✓ · typecheck:tests ✓ · unit 65/65 ✓ · build ✓ · smoke 19/19 ✓ · sitemap 267 locs ✓ · e2e 18/18 ×3 consecutive ✓. All session-002 claims re-verified on the fresh clone — aligned.

## Audit summary (session-002 changes + deferred items)
0 CRITICAL · 1 HIGH · 2 MEDIUM · 5 LOW · 8 INFO. All ten session-002 changes verified genuinely implemented and correct, EXCEPT the two below.

## Findings to fix (this session)

| ID | Sev | Finding | Fix |
|---|---|---|---|
| H-1 | HIGH | `.env.example` documents `TRUSTED_PROXY_DEPTH=0` = "ignore XFF, share the unknown bucket", but `clientKey` clamps depth to `Math.max(1, …)` — explicit 0 is impossible; live-verified: forged single-hop XFF still buckets per-forged-value on direct exposure, defeating every limiter while the docs promise fail-closed | Honor explicit `0` as "ignore XFF entirely" (fall to `x-real-ip`/`unknown`); unset stays 1; unit tests RED first |
| M-1 | MED | Regression (session-002 L5 fix): `ensureSummaryLoaded` lost its in-flight guard — every `FavouriteButton` mount (~25/page) fires its own `/api/summary` fetch until one resolves; storm repeats on failure | Memoize the in-flight promise; keep retry-on-failure; unit test with stubbed fetch asserting 1 request across concurrent callers |
| M-2 | MED | `docs/DEPLOYMENT.md` still describes the old ElyBeauty app (SQLite, Prisma, AUTH_SECRET, admin console, CF-Connecting-IP claims — none exist here) | Rewrite for this stack: Postgres + Drizzle + db:setup, TLS proxy forwarding XFF/proto, NEXT_PUBLIC_SITE_URL build-time, TRUSTED_PROXY_DEPTH postures |
| L-E | LOW | Deferred M3: mobile drawer `aria-modal` without focus trap/restore; hotspot popover `role="dialog"` with no Escape/outside-click | Drawer: Tab wrap + focus restore on close (~25 lines in the existing effect); popover: outside-pointerdown + Escape close, honest non-modal semantics; 2 new e2e pins |
| L-A | LOW | Sitemap DB-outage catch is silent (ships a 2-URL sitemap at build with zero logs) | `logError("sitemap.db_unavailable", …)` in the catch |
| L-B | LOW | smoke.sh depends on localhost's Secure-cookie exemption (undocumented); new 415/413 gates unpinned at HTTP level | localhost note + two new smoke checks (415 text/plain, 413 >16 KB) |
| L-D | LOW | `pool.on("error")` re-registers on every dev HMR reload of db/index.ts → duplicate logs / MaxListeners warning | Register the listener only when constructing a new Pool (guard on the cached global) |
| I-5 | INFO | Legacy `!p-0` / `!px-4 !py-2` prefix form (2 lines) — verified compiling but legacy in v4 | Convert to suffix form `p-0!` etc. while touching these areas |
| I-6 | INFO | `MAX_JSON_BYTES` cap actually counts UTF-16 code units, not bytes | Comment the constant honestly |

## Deferred again (documented)
- L-C cart/favourites orphan rows: real (live-reproduced) but hygiene-only; needs a sweep job (no cron infra in-app) — PAD known-issues
- I-4 unused icons/tokens: tree-shaken, zero runtime cost — keep as design palette
- I-7 SearchAction targets robots-disallowed /search: IKEA-parity, deliberate
- CSP header, migration journal: standing known issues

## Execution order (TDD)
1. RED: http.test.ts depth-0 pins (explicit 0 → XFF ignored; unset → 1; "0" string honored; garbage → 1) → GREEN in http.ts + trustedProxyDepth
2. RED: shopping-store in-flight test (stubbed fetch, 3 concurrent ensureSummaryLoaded → 1 call; failure → next call refires) → GREEN guard
3. L-A sitemap logError; L-D pool listener guard; I-6 comment; I-5 suffix form
4. L-E focus trap + popover (e2e pins written first: tab-wrap, focus restore, popover Escape/outside-click)
5. L-B smoke.sh additions; M-2 DEPLOYMENT.md rewrite
6. Full gate: lint → typecheck → typecheck:tests → unit → build → smoke → e2e ×3
7. Browser verification (mobile nav incl. keyboard) + screenshots refresh
8. Docs sweep (PAD v2.2.0, SKILL v1.2.0, worklog Task 121) + commit + SSH push

## Evidence to capture
- Unit counts before (65) / after; e2e 18→20 ×3 green; smoke 19→21; sitemap 267 unchanged; live curl: depth-0 posture ignores forged XFF

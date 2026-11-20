# Nordhem Furnishing Store — Remediation Plan
**Date:** 2026-11-20 · **Session:** 006 · **Baseline commit:** `7b525dd` (main)
**Inputs:** docs/session_6.md, session-005 artifacts (worklog Task 123, plan-005), the operator's new `docker-compose.yml` + `docs/sample_DEPLOYMENT.md`, fresh audit (web-application + tdd skill methodology; live curl/psql/agent-browser/scanner probes; skills/ excluded). homenest-store-s patterns re-checked where relevant.

## Baseline (verified this session, all exit-code-checked)
lint 0/0 ✓ · typecheck ✓ · typecheck:tests ✓ · unit 73/73 (10 files) ✓ · build cold ✓ · smoke 21/21 ✓ · **e2e 23/23 ×3** · sitemap 276 ✓ · DB 242/23 (7 tables). PostgreSQL 17 restored from the surviving data dir (sandbox recycle pruned empty runtime subdirs — `pg_notify`, `pg_tblspc`, `pg_logical/snapshots`, `pg_commit_ts`, `pg_dynshmem` recreated; catalog intact). The three new commits since `ebb93a6` are doc/tooling-only (`docs/session_6.md`, `docker-compose.yml`, `docs/sample_DEPLOYMENT.md`).

## Audit summary
0 CRITICAL · 1 HIGH · 4 MEDIUM · 7 LOW · 6 INFO + 33 enumerated mismatches between `docs/sample_DEPLOYMENT.md` (written for the sibling "home-furnishing-store" repo) and this codebase. Session-005 fixes re-verified green live (XFF opt-in, FOR UPDATE present, sitemap 276, pool export gone, lint 0).

## Findings to fix (this session)

| ID | Sev | Finding | Fix |
|---|---|---|---|
| H-1 | HIGH | `x-real-ip` fallback forges rate-limit buckets on direct exposure — **live-verified**: 12/12 rotating `x-real-ip` headers bypassed the track limiter (0 × 429); same class as session-005 H-1 but the unconditional fallback was left in. | Honor `x-real-ip` only when `TRUSTED_PROXY_DEPTH >= 1` (declared proxy trust); default = shared "unknown" bucket. RED pin in http.test.ts first; `.env.example`/DEPLOYMENT prose swept; live re-probe. |
| M-1 | MED | `FOR UPDATE` on the cart JOIN locks `products` rows too — cross-session contention on hot products + theoretical multi-cart deadlock (40P01 uncaught). | `.for("update", { of: [cartItems] })` — only the session's cart rows need serializing. Update checkout-lock pin regex in the same commit. |
| M-2 | MED | `docker-compose.yml` is a root file NOT in the Tailwind `@source not` guard — scanner-verified: it survives the guard, is scanned, and colon-form arbitrary tokens in `.yml` ARE extracted (poison experiment). A future comment edit could break `next build`. | Add `@source not "../../docker-compose.yml";` to globals.css + the REQUIRED_EXCLUSIONS pin (count-lockstep). |
| M-3 | MED | Catch-all `[...slug]` serves HTTP **200 soft-404s** for any unknown URL (≤6 segments) — indexable, no noindex/canonical (live-verified on `/totally-unknown-page-xyz`). | `notFound()` when the path matches no info-page rule prefix → real 404. RED pin in seo-routes.test.ts (text assertion); e2e assertion in seo-platform.spec.ts; check the existing `12-404` screenshot expectation still holds (it uses `/cat/does-not-exist` — unaffected). |
| M-4 | MED | docker-compose.yml binds `0.0.0.0:5432` with postgres:postgres — contradicts the loopback-only repo contract. | `ports: - "127.0.0.1:5432:5432"`. |
| L-1 | LOW | DEPLOYMENT.md:112 sitemap count stale (267 → 276; missed by session-005's sweep). | Corrected in the full rewrite. |
| L-2 | LOW | docker-compose.yml header: "9 tables … ensureSeed" — actually **7 tables**, function is `ensureCatalog()`. | Fix comment; mention `npm run db:setup`. |
| L-3 | LOW | `.gitignore` lacks `*.key` / `ssh-key.txt` (sample §12's claim is false here). | Add both patterns. |
| L-4 | LOW | Security headers pinned by no test. | e2e assertion in seo-platform.spec.ts (X-Frame-Options DENY etc. on `/`). |
| L-7 | LOW | checkout-lock pin regex breaks under M-1's `of:` form. | Update pin in the same commit as M-1. |

## DEPLOYMENT.md rewrite (the session's main deliverable)
Replace docs/DEPLOYMENT.md with a 12-section guide modeled on the sample's structure but **100% this codebase's verified facts** (the audit's fact inventory): 7 tables (categories, products, cart_items, favourites, orders, order_items, family_members); 11 page routes + 8 API route files (12 methods) with the true limiter table (120/120/90/10/10/5, health+summary unlimited); 3 operator env vars (DATABASE_URL, NEXT_PUBLIC_SITE_URL, TRUSTED_PROXY_DEPTH incl. the H-1 change); plain `.next/` build (NO standalone); 4 security headers, no HSTS/CSP (documented); IKEA CDN imagery via plain `<img>`; no payment step (demo checkout copy); `ensureCatalog()` lazy seeding under `pg_advisory_xact_lock(727001)` + `db:setup`; rootless PG §primary + **Docker alternative via docker-compose.yml** (loopback-fixed, 7-table truth, `db:setup` after `up -d`); reseed recipe with the correct 7-table TRUNCATE; smoke 21 + verification checklist with valid probes only; SSH-wrapper push runbook with the mandatory `--remote` override. Do NOT port any of the 33 sample mismatches.

## Deferred again (documented)
CSP header · migration journal · HSTS (belongs at the TLS edge) · axe-core e2e (L-6, optional) · unused tree-shoken tokens · SearchAction/robots parity · in-memory limiter single-instance · setCartQuantity last-writer-wins.

## Execution order (TDD)
1. **H-1** RED pin (unset env + x-real-ip → "unknown"; depth 1 + x-real-ip → honored) → fix http.ts → GREEN → live rotating x-real-ip re-probe (must 429) → `.env.example` prose.
2. **M-1+L-7**: update checkout-lock pin to require `of: [cartItems]` → RED → apply `.for("update", { of: [cartItems] })` → GREEN.
3. **M-3**: seo-routes RED pin (catch-all must call notFound for ruleless paths) → implement `notFound()` when no rule matches → GREEN → e2e `expect 404` in seo-platform.spec.ts.
4. **M-2+M-4+L-2**: scanner guard line + test pin for docker-compose.yml; loopback port bind; comment fix (7 tables, ensureCatalog).
5. **L-3+L-4**: .gitignore key patterns; security-headers e2e pin.
6. **DEPLOYMENT.md rewrite** (facts from the audit inventory; includes L-1 fix).
7. Doc sweeps: PAD v2.5.0 revision block, SKILL v1.5.0 §14 lessons + state line, worklog Task 124, docs/session_6.md (append the session record), AGENTS/CLAUDE/README counts (unchanged this session: 73/23/21/276 — verify).
8. Screenshots refresh (`scripts/capture-screenshots.mjs` against :3100).
9. Full gate with exit-code-checked verdicts: lint 0/0 → typecheck → typecheck:tests → unit (73+2=75) → build cold → smoke 21/21 → **e2e 23/23 (+2 new assertions inside existing specs → still 23 tests) ×3** → sitemap 276 → live probes (x-real-ip 429, soft-404 now 404).
10. Commit + SSH push via wrapper with `--remote git@github.com:nordeim/nordhem-furnishing-store.git` (the default remote is the stale ely-beauty one — audit re-verified).

## Evidence to capture
- H-1 RED (2 pins) → GREEN; live x-real-ip rotation 429s post-fix.
- M-1 pin updated RED → GREEN with `of:` in source.
- M-3 RED → GREEN; live `/totally-unknown-page-xyz` → 404 post-fix; e2e green.
- M-2 scanner-guard pin RED → GREEN.
- Full gate exit codes; e2e ×3; screenshots 12/12 PIL-valid.

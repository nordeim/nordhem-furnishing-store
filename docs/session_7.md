# Session 007 — the CSRF-trust closure + dead-link repair + CSP/axe gates cycle

**Baseline (pull to 5c86ef8, all exit-code-checked):** lint 0/0 · typecheck ✓ · typecheck:tests ✓ · unit 76/76 · build cold ✓ · smoke 21/21 · e2e 25/25 · sitemap 276. All five session-006 fixes re-verified holding live. The operator's new commit was doc-only (this session's context, sample_DEPLOYMENT.md consumed and deleted).

## What was done

**Audit (read-only subagent + live probes; web-application + tdd skill methodology):** 0 CRITICAL · 0 HIGH · **4 MEDIUM · 8 LOW · 10 INFO**, plus verdicts on every deferred item (CSP and axe-core = do-now; migration journal and shared-store limiter = do-later; HSTS, token cleanup, SearchAction parity, setCartQuantity LWW = never/accept). Test configs judged sound — the standing "add vitest/playwright config" instruction was a deliberate no-op; the real gaps were content, not config.

**Browser verification (agent-browser):** mobile drawer state machine (open, submenu → navigate → unmount, Escape, close + focus restore + scroll unlock); hero popover toggle; combobox ArrowDown; full manual cart→checkout→order→track round-trip; the 17 dead footer links live-confirmed.

**Remediation (TDD, plan-007):**
- **M-1**: `hasForeignOrigin` now honors `x-forwarded-host` only behind declared proxy trust — the last client-authorable header in the trust paths. Live pairing probe (`Origin` + `x-forwarded-host` both evil) went 404-pass → **403**.
- **M-2**: RULES extended with broad prefixes — **17 dead footer/home links repaired**; new `tests/unit/link-census.test.ts` censuses every rendered internal href (RED listed all 17 → GREEN) + an e2e resolved-set pin; `/totally-unknown-page-xyz` still 404s.
- **M-3**: **doc counts machine-enforced** — `tests/unit/docs-counts.test.ts` (5 RED on the stale sites sessions 005/006 missed → GREEN after the sweep to 84 unit / 13 files / 38 e2e / 7 tables).
- **CSP (long-deferred, now live)**: header in next.config.ts with the audited allowlist (img-src self + ikea.com + data:, object-src none, frame-ancestors none, inline allowances for Next's RSC bootstrap and the JSON-LD blocks) — e2e-pinned, JSON-LD e2e still green.
- **axe gate (long-deferred, now live)**: `@axe-core/playwright` sweep of 8 surfaces at serious/critical — immediately caught and fixed a `label-content-name-mismatch` (favourite button visible label now includes the product name) plus the L-2 heading-order skips (sr-only `<h2>` before the /cat, /search, /favourites grids).
- **M-4**: the empty `recycled-materials-700324` collection dropped (0 of 242 products ever matched the heuristic, yet it was linked + sitemapped) — 23→22 categories, sitemap 276→**275**, sustainable guide features `lowest-price`, home card retargeted, DB reseeded and verified.
- **L-1/L-3/L-4/L-6**: category meta descriptions; `/api/health` `no-store`; `og:image` + `twitter:card` on product pages; 404 page title — all e2e-pinned. **L-8**: unused icons deleted. **I-10**: compose header renamed. **DEPLOYMENT**: CSP paragraph, direct-exposure ceiling note (L-7), counts.

**Verification — all exit-code-checked:** lint 0/0 · typecheck ✓ · typecheck:tests ✓ · **unit 84/84 (13 files)** · build cold ✓ · smoke **21/21** · **e2e 38/38** · sitemap **275** · screenshots **12/12** PIL-valid · live probes (CSRF pairing 403, health no-store, CSP present, `/planners` 200, old collection 404).

**Deferred (documented):** migration journal (first real schema change) · shared-store limiter (multi-instance deploy) · HSTS (TLS edge) · SearchAction/robots parity (deliberate) · setCartQuantity LWW (accept) · CSP nonces (later tightening).

---

I'll continue this task from where we left off. Let me start by refreshing the local workspace and reviewing the repository.
The workspace was reset (the repo folder is gone, but `pg/` data, `bin/` SSH shim and `scripts/` survived). This is session 006. Let me set up the plan and re-clone.
**PostgreSQL 17 restored** — the server is back up on :5432 with the catalog intact (242 products). The sandbox recycle had pruned empty runtime subdirectories from the data dir; recreating them (`pg_notify`, `pg_tblspc`, `pg_logical/snapshots`, etc.) brought it back without data loss. Now installing npm deps and running the baseline gate:
**Baseline fully green** (all exit-code-checked): lint 0/0 · typecheck ✓ · typecheck:tests ✓ · unit 73/73 · build cold ✓ · smoke 21/21 · e2e 23/23 ×3 · sitemap 276. The three new commits since session 005 are doc-only (`docs/session_6.md`, `docker-compose.yml`, `docs/sample_DEPLOYMENT.md`) — no code changes. Launching the audit subagent now:
Excellent audit. Key actionable findings: **H-1** `x-real-ip` forges buckets (live-verified), **M-1** `FOR UPDATE` over-locks products, **M-2** docker-compose.yml unguarded in the scanner, **M-3** soft-404s on unknown URLs, **M-4** port bound on 0.0.0.0. Now browser-verifying the app, then writing the plan:
All browser verification is done — mobile nav state machine (open/submenu/nav/unmount/Escape/close+focus-restore/scroll-lock), hero popover toggle, ArrowDown keyboard nav into search suggestions, full cart→checkout→order→track round-trip, and the soft-404 bug confirmed (200 status on unknown URLs, feeds M-3). Now writing the session-006 remediation plan:
Plan validated against the codebase (all file paths, regexes, and probe facts come from the audit's live verification). Executing TDD — first the RED pins:
**RED confirmed (2 pins).** Now the GREEN fix plus the remaining code changes in one batch:
**H-1 GREEN (15/15).** Now M-1 (RED pin first), then the batch script for M-2/M-3/M-4/L-2/L-3/L-4:
**M-1 GREEN.** Now the M-3 RED pin (catch-all soft-404), then a batch script for the rest:
**M-3 RED (2 pins).** Applying the GREEN implementation + the rest of the batch (M-2, M-4, L-2, L-3, L-4) in one script:
The regex expects no space between `!` and the identifier, but the code has `!isKnownInfoPath(segments)`. My regex `\w*\.?` doesn't match because after `!` comes `isKnownInfoPath(` directly — that should match `\w*`... The issue is `[\s\S]{0,120}` — the actual gap includes the comment block (~180 chars). Fixing the pin to be robust:
**Unit 76/76 · build ✓.** Wait — the plan said 77 (73 + 2 new http + 1 M-3 predicate = 76; the http suite went 14→15 and catch-all added 2, so 73+1+2=76). Let me fix the doc counts, then verify live behavior:
**All live fixes verified**: unknown paths now 404 (was 200 soft-404), known info routes still 200, and rotating `x-real-ip` now 429s at request 10 (was 0/12 before). Fixing the doc count (76, not 77) and running e2e:
**e2e 25/25** (23 + 2 new pins). Now the main deliverable — rewriting DEPLOYMENT.md from the sample, adapted to this codebase's verified facts:
DEPLOYMENT.md rewritten (12 sections, all facts from the audit's verified inventory). Now screenshots + remaining doc sweeps + worklog + session log in one batch:
**Full gate green** (exit-code-checked): lint 0/0 · typecheck ✓ · typecheck:tests ✓ · unit 76/76 · build cold ✓ (rebuilt earlier) · smoke 21/21 · **e2e 25/25 ×3 total** · sitemap 276. Committing and pushing:
The paramiko module isn't found by the shim's python (the sandbox reset wiped the pip install). Reinstalling:
Session 006 is complete and pushed. Final report:

## Session 006 — complete (pushed as `c9c5e18` on `main`, remote ref verified by the SSH wrapper)

**Workspace & alignment** — Sandbox was recycled: re-cloned at `7b525dd` (the three new commits since session 005 are doc/tooling-only: `docs/session_6.md`, `docker-compose.yml`, `docs/sample_DEPLOYMENT.md`). PostgreSQL 17 was **restored from the surviving data dir** — the recycle had pruned empty runtime subdirectories (`pg_notify`, `pg_tblspc`, `pg_logical/snapshots`, `pg_commit_ts`, `pg_dynshmem`); recreating them brought the server back with zero data loss (242 products / 23 categories / 7 tables intact). All session-005 doc claims were re-verified TRUE against the tree and live servers. `skills/` excluded from all code checking/testing/compilation as instructed.

**Baseline gate** (all exit-code-checked): lint 0/0 · typecheck ✓ · typecheck:tests ✓ · unit 73/73 · build cold ✓ · smoke 21/21 · e2e 23/23 ×3 · sitemap 276.

**Audit** (read-only subagent using web-application + tdd skills, plus live curl/psql/agent-browser/oxide-scanner probes): **0 CRITICAL · 1 HIGH · 4 MEDIUM · 7 LOW · 6 INFO**, plus **33 enumerated mismatches** between the operator's `sample_DEPLOYMENT.md` (written for the sibling home-furnishing-store repo) and this codebase.
- **H-1 (live-verified)**: session-005's fix closed only the XFF half of the rate-limit trust hole — the unconditional `x-real-ip` fallback still minted buckets (12/12 rotating spoofed headers bypassed the track limiter).
- **M-1**: the session-005 `FOR UPDATE` also locked `products` rows (cross-session contention + deadlock vector). **M-2**: scanner-probe-proven — the new `docker-compose.yml` root file survives the `@source` guard and `.yml` colon-form poison tokens ARE extracted. **M-3**: catch-all soft-404s (any unknown URL → 200, indexable). **M-4**: compose published `0.0.0.0:5432` with postgres:postgres.

**Mobile nav / Tailwind v4** (agent-browser, 390×844 + 1440×900): drawer open/submenu-navigate/unmount/Escape/close+focus-restore/scroll-lock all pass; hero popover toggle passes; search combobox ArrowDown focuses the first suggestion; full manual cart→checkout→order→track round-trip passes. **No Tailwind v4 display-utility bug** (conditional mount; zero `classList`).

**Remediation (TDD red→green, plan-006)**: H-1 — `x-real-ip` honored only with declared proxy trust (live re-probe: 429 at request 10) · M-1 — lock scoped via `.for("update", { of: [cartItems] })` · M-3 — `isKnownInfoPath()` + `notFound()` (live: unknown → **404**, known routes unaffected) · M-2/M-4/L-2 — scanner guard + pin for docker-compose.yml, loopback port bind, compose comment truth · L-3/L-4 — `.gitignore` key patterns, security-headers e2e pin.

**DEPLOYMENT.md rewrite (main deliverable)** — 12-section guide from the sample's structure with **100% this codebase's verified facts** (7 tables, 11 pages + 8 API files, limiter table 120/120/90/10/10/5, plain `.next/` build, IKEA CDN imagery, demo checkout, `ensureCatalog` seeding, rootless PG primary + **Docker alternative §4b**, correct 7-table TRUNCATE reseed, `IKSG-` probe bodies, stale-wrapper `--remote` warning). All 33 sibling-repo claims rejected.

**Final gate** (exit-code-checked): lint 0/0 · typecheck ✓ · typecheck:tests ✓ · **unit 76/76 (11 files)** · build cold ✓ · smoke 21/21 · **e2e 25/25 ×3** · sitemap 276 · screenshots **12/12** PIL-valid. Docs: PAD v2.5.0, SKILL v1.5.0 (§14 lessons), AGENTS/CLAUDE/README counts + prose, `.env.example` x-real-ip note, worklog Task 124, `docs/session_6.md`, plan-006.

Saved for you under download/: [session-006_summary.md](/home/z/my-project/download/session-006_summary.md), [DEPLOYMENT.md](/home/z/my-project/download/DEPLOYMENT.md), [2026-11-20_session-006_remediation-plan.md](/home/z/my-project/download/2026-11-20_session-006_remediation-plan.md), [session_6.md](/home/z/my-project/download/session_6.md). The repo itself is at `/home/z/my-project/nordhem-furnishing-store` (clean tree, `main` synced with origin).

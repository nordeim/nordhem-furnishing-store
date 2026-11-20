# Session 006 — the x-real-ip trust closure + soft-404 + DEPLOYMENT rewrite cycle

**Baseline (re-clone at 7b525dd, all exit-code-checked):** lint 0/0 · typecheck ✓ · typecheck:tests ✓ · unit 73/73 · build cold ✓ · smoke 21/21 · e2e 23/23 ×3 · sitemap 276. PostgreSQL 17 restored from the surviving data dir (the sandbox recycle pruned empty runtime subdirs — `pg_notify`, `pg_tblspc`, `pg_logical/snapshots`, `pg_commit_ts`, `pg_dynshmem` — recreated without data loss; catalog intact 242/23). The three commits since `ebb93a6` are doc/tooling-only: `docs/session_6.md`, `docker-compose.yml`, `docs/sample_DEPLOYMENT.md`.

## What was done

**Browser verification (agent-browser)** — mobile drawer state machine (open, Products submenu → navigate `/cat/sofas-armchairs-700640` → unmount, Escape, close button + focus restore + scroll unlock); hero popover own-button toggle; search combobox ArrowDown → first suggestion focused; full manual commerce round-trip (BILLY add-to-cart → badge/toast → cart line → checkout → `IKSG-9977268190` → track-order right/wrong email). No Tailwind v4 display-utility bug. The soft-404 bug was confirmed live here (unknown path → 200 + indexable title) before being fixed.

**Audit (read-only subagent + live probes; web-application + tdd skill methodology)** — 0 CRITICAL · 1 HIGH · 4 MEDIUM · 7 LOW · 6 INFO, plus **33 enumerated mismatches** between the operator's `docs/sample_DEPLOYMENT.md` (written for the sibling home-furnishing-store repo) and this codebase:
- **H-1 (live-verified)**: `clientKey`'s unconditional `x-real-ip` fallback minted fresh rate-limit buckets — 12/12 rotating spoofed headers bypassed the track limiter. The session-005 fix had closed only the XFF half of the hole.
- **M-1**: the session-005 `FOR UPDATE` on the cart JOIN also locked `products` rows (cross-session contention + deadlock vector). **M-2**: scanner-probe-verified — `docker-compose.yml` (new root file) survives the `@source not` guard and `.yml` colon-form tokens ARE extracted. **M-3**: catch-all soft-404s (live). **M-4**: compose published `0.0.0.0:5432` with postgres:postgres.

**Remediation (TDD, plan at docs/plans/2026-11-20_session-006_remediation-plan.md)**
- **H-1**: `x-real-ip` is honored only when `TRUSTED_PROXY_DEPTH >= 1`; the default posture ignores BOTH client-supplied IP headers. 2 pins RED→GREEN; live re-probe: rotating `x-real-ip` now 429s at request 10.
- **M-1**: lock scoped to `.for("update", { of: [cartItems] })`; the checkout-lock pin was updated in the same commit (RED→GREEN).
- **M-3**: `isKnownInfoPath()` exported from `src/content/pages.ts`; the route calls `notFound()` for ruleless paths. Live: `/totally-unknown-page-xyz` → **404**; `/offers` and `/stores/restaurant` still 200. New `tests/unit/catch-all-404.test.ts` + e2e pin.
- **M-2/M-4/L-2/L-3/L-4**: scanner guard + test pin extended to `docker-compose.yml`; compose port bound to `127.0.0.1:5432:5432`; compose comment corrected (7 tables, `ensureCatalog`); `.gitignore` rejects `*.key`/`ssh-key.txt`; security headers now e2e-pinned (incl. no `x-powered-by`).
- **DEPLOYMENT.md rewritten** from the operator's sample — 12-section structure, every fact re-derived from this tree and re-verified live (7 tables; 11 pages + 8 API files; limiter table 120/120/90/10/10/5; plain `.next/` build; IKEA CDN imagery; demo checkout; `ensureCatalog` lazy seeding under `pg_advisory_xact_lock(727_001)`; rootless PG primary + Docker alternative §4b; correct 7-table TRUNCATE reseed recipe; `IKSG-` probe bodies; the stale-wrapper `--remote` warning). All 33 sibling-repo claims rejected. The stale sitemap count (267 → 276) died in the rewrite.

**Verification — all exit-code-checked:** lint 0/0 · typecheck ✓ · typecheck:tests ✓ · **unit 76/76 (11 files)** · build cold ✓ · smoke **21/21** · **e2e 25/25** · sitemap **276** · screenshots **12/12** PIL-valid · live probes (x-real-ip 429 at request 10; unknown path 404).

**Deferred (documented):** CSP header · migration journal · HSTS (TLS-edge concern) · axe-core e2e · unused tree-shoken tokens · SearchAction/robots parity · in-memory limiter single-instance · setCartQuantity last-writer-wins.

---

I'll start by reading the pasted content and understanding the current workspace state.
The pasted content is my operating instruction set — I've internalized it. Now let me set up the full task plan and get the repo.
Docs reviewed. Now validating understanding against the actual codebase structure.
Codebase structure validated — it matches the docs (6-table schema, route-handler idiom, scanner guard with `../../` anchoring, 12 screenshots, tests in place). Now setting up PostgreSQL and installing npm dependencies in parallel.
PostgreSQL 17 is up on :5432 with `app_db`. Now installing npm dependencies (this takes a while, so running it in the background while I review the reference repo).
**Progress so far:** Repo cloned & docs fully reviewed (AGENTS/CLAUDE/README/PAD v2.3.0/SKILL v1.3.0, session-004 plan, worklog Tasks 119–122) — the codebase matches the documented architecture. PostgreSQL 17 is running rootless on :5432 (`app_db` seeded-ready), npm deps installed, and the homenest-store-s reference repo is cloned and reviewed (same Next 16/React 19/TS-strict/Tailwind v4 CSS-first/Vitest/Playwright lineage; it uses Prisma+SQLite where nordhem deliberately uses Drizzle+PostgreSQL).

Now running the baseline gate chain (lint → typecheck → typecheck:tests → unit) and seeding the DB.
Baseline so far: lint ✓ (1 pre-existing warning in header.tsx), typecheck ✓, typecheck:tests ✓, **unit 70/70 ✓**, DB seeded (23 categories / 242 products). Now the production build.
**Baseline is fully green** (all exit-code-verified): lint ✓ · typecheck ✓ · typecheck:tests ✓ · unit **70/70** · build ✓ · smoke **21/21** · e2e **23/23 ×3 consecutive runs**. The first run's 19 failures were just a missing Chromium build for this Playwright version (browser-version mismatch, not code). The docs' session-004 claims check out against reality.

Now launching the audit — a read-only subagent using the repo's `web-application` skill methodology, plus my own targeted checks of the recent session-004 changes.
**H-1 live-verified**: with a rotating spoofed `x-forwarded-for`, 12/12 requests bypass the checkout rate limiter (vs. 429 on the 11th request without rotation). The default `TRUSTED_PROXY_DEPTH=1` trusts a single client-supplied hop on direct exposure — a real HIGH. H-2 (checkout double-order race, no `FOR UPDATE`) is confirmed by code-read.

Now the browser verification phase — starting the dev server and checking the mobile nav with the agent-browser tool.
Mobile viewport set (390×844) — hamburger is visible (`display: grid`). Now testing the mobile menu drawer behavior:
The drawer isn't mounting on click in this browser session — but the Playwright mobile suite passes 23/23, so this may be a hydration-timing issue on the freshly-compiled dev page. Let me reload and wait for hydration to complete:
The button wiring is correct (`onClick={() => setPanel("mobile")}`), and native click listeners fire — but React's handler doesn't run. This smells like a **hydration failure** (page paints but never hydrates). Let me verify:
Hydration is confirmed (React fiber props present). Earlier "not hydrated" reads were misleading. Now clicking the hamburger:
**Mobile drawer works correctly** — mounted with `display:flex`, `aria-expanded=true`, body scroll locked. The earlier failures were a stale first browser session (loaded at desktop width before resize; fresh session at 390px works). Continuing the state-machine checks:
**Mobile navigation fully verified via agent-browser**: open ✓ · Products submenu expands + navigates (`/cat/sofas-armchairs-700640`) and drawer unmounts ✓ · Escape closes ✓ · Close button closes with **focus restored to hamburger** + scroll unlock ✓ · No Tailwind v4 `hidden`-toggle bug (conditional mount works exactly as designed). 

Now the desktop surfaces + hero popover + SEO checks:
Now writing the session-005 remediation plan, informed by the audit, my live probes, and the skills (web-application, tdd, nextjs16-tailwind4).
Now the session-005 remediation plan:
Step budget is limited — switching to batch execution mode. Reading the files I need to edit in one batch:
Step budget is tight — batching everything now. Reading the remaining code I need:
Executing remediation now — batching TDD edits. First, the RED tests (H-1, H-2, L-7):
**RED confirmed** (2 failing pins — exactly the H-1 behavior change). Now flipping the implementation to GREEN plus all remaining fixes in one batch:
**RED confirmed for H-2.** Now applying all remaining code fixes in one batch (H-2 lock, L-7 sitemap, L-8 canonical, M-4 keyboard nav, M-3/L-4/L-5/L-6):
**H-2 GREEN.** Step budget is low — batching all remaining code edits + doc counts into one persisted script:
**Gate progress: lint 0 errors 0 warnings ✓ · typecheck ✓ · typecheck:tests ✓ · unit 73/73 ✓.** Now build + full verification + screenshots in one batch:
**e2e 23/23 ×3 (exit 0 each) · screenshots 12/12 valid.** Now the final docs batch (README expansion, PAD revision, SKILL lessons, worklog, session log) in one script:
Session 005 is complete and pushed. Final report:

## Session 005 — complete (pushed as `ebb93a6` on `main`, remote ref verified by the SSH wrapper)

**Workspace & alignment** — Re-cloned `nordeim/nordhem-furnishing-store` at `d42a761`, reviewed AGENTS/CLAUDE/README/PAD/SKILL/session-004 docs/worklog, and validated every claim against the codebase — all TRUE. PostgreSQL 17 installed rootless on :5432 via `docs/setup_pg_z.sh` + the rootless-postgresql skill; catalog seeded (23 categories / 242 products). homenest-store-s reference repo reviewed for stack patterns (same Next 16/React 19/TS-strict/Tailwind v4 lineage; nordhem's Drizzle+PostgreSQL choice is deliberate per PAD ADR-002). The `skills/` folder was excluded from all code checking/testing/compilation as instructed.

**Baseline gate** (all exit-code-checked): lint ✓ · typecheck ✓ · typecheck:tests ✓ · unit 70/70 · build ✓ · smoke 21/21 · **e2e 23/23 ×3 consecutive runs** · sitemap 267. (First e2e run failed 19 tests — purely a missing Chromium build for the pinned Playwright version; after `playwright install chromium` everything passed.)

**Audit** (read-only subagent using the repo's web-application + tdd skills, plus my own live curl/psql/agent-browser probes): **0 CRITICAL · 2 HIGH · 4 MEDIUM · 9 LOW · 10 INFO.**
- **H-1 (live-verified HIGH)**: `clientKey` defaulted proxy depth to 1, so on direct exposure a single client-supplied `x-forwarded-for` hop was trusted — 12/12 rotating spoofed XFFs bypassed the checkout rate limiter.
- **H-2 (code-read HIGH)**: checkout transaction read cart lines without a lock → double-order race.

**Mobile nav / Tailwind v4 verification** (agent-browser at 390×844 + 1440×900): drawer open ✓, Products submenu expand + navigate + unmount ✓, Escape ✓, close button with focus restore ✓, scroll lock ✓; hero popover own-button toggle / inner-span click / Escape / outside-click ✓; search suggestions ✓; a full manual round-trip (add-to-cart → badge/toast → cart → checkout → confirmation → track-order right/wrong email) ✓. **No Tailwind v4 `hidden`-toggle bug** — the conditional-mount pattern holds; zero `classList` in src/.

**Remediation (TDD, red→green per slice, plan at `docs/plans/2026-11-20_session-005_remediation-plan.md`):**
- **H-1**: proxy trust is now opt-in — `TRUSTED_PROXY_DEPTH` unset/garbage = direct exposure (XFF ignored entirely, fail-closed "unknown" bucket); live re-probe shows rotating XFF now 429s at request 10. Unit pins rewritten RED→GREEN; `.env.example`/AGENTS/CLAUDE/PAD/DEPLOYMENT swept.
- **H-2**: cart rows locked `FOR UPDATE` at the head of the checkout transaction — race closed, pinned by new `tests/unit/checkout-lock.test.ts`.
- **L-7**: 9 indexable info routes added to the sitemap (267 → **276 locs**, live-verified). **L-8**: canonical links on `/cat/*` and `/p/*`. **M-4**: combobox ArrowDown/ArrowUp keyboard nav + e2e pin. **M-3/L-4/L-5/L-6**: dead `pool` export removed, stale scanner-guard line dropped, lint now **0 warnings**, prune-script footgun documented. **L-1/L-2/L-3**: stale doc counts swept (e2e 18→23, unit 52→73, mobile-nav 6→8).
- Sitemap/SEO checked and improved; vitest + playwright suites were already in place per the repo configs and were extended (+3 unit tests, +1 e2e assertion).

**Final gate** (all exit-code-checked): lint **0 errors 0 warnings** · typecheck ✓ · typecheck:tests ✓ · **unit 73/73 (10 files)** · build (cold `.next`) ✓ · smoke **21/21** · **e2e 23/23 ×3** · sitemap **276** · screenshots **12/12** PIL-valid, refreshed in `docs/screenshots/`.

**Docs** — README expanded per the readme-md skill (badges, overview, env-var table, troubleshooting); PAD v2.4.0 revision block; SKILL v1.4.0 with §13 lessons; AGENTS env table; DEPLOYMENT §1/§5; worklog Task 123; `docs/session_5.md`; plan-005. All committed to `main` and pushed via `docs/ssh_git_wrapper_v3.py` (paramiko shim deployed to `~/bin/` outside the repo; key shredded after push).

**Deferred** (documented in plan-005 + PAD): CSP header, migration journal, unused tree-shaken tokens, SearchAction/robots parity, in-memory limiter single-instance, `setCartQuantity` last-writer-wins (no money impact).

Files saved for you under download/: [session-005_summary.md](/home/z/my-project/download/session-005_summary.md), [2026-11-20_session-005_remediation-plan.md](/home/z/my-project/download/2026-11-20_session-005_remediation-plan.md), [session_5.md](/home/z/my-project/download/session_5.md), [nordhem-README.md](/home/z/my-project/download/nordhem-README.md). The remediated repo itself is at `/home/z/my-project/nordhem-furnishing-store` (working tree clean, `main` synced with origin). Send a follow-up message anytime to continue from the saved state.

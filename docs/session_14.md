# Session 014 — the rem-unit breakpoint + focus-continuity + total-schema cycle

**Environment:** workspace SURVIVED (no reset) — pulled `c5d7183` (operator doc-only: session_14.md, the session-013 raw record). PG 22/242 intact, node_modules, paramiko, chromium-1255, `.env` all present.

**Baseline (all exit-code-checked):** lint 0/0 · typecheck ✓ · typecheck:tests ✓ · unit 110/110 (17 files) · build cold ✓ · e2e 53/53 · smoke 21/21 · sitemap 274. Dev server verified live on both origins: the S12-I4 submenu reset holding, drawer navigation, and **the S13-L2 lg-closer holding live** (open + scroll-locked at 390px → unmounted + unlocked at 1440px). Desktop clean; no Tailwind v4 bug.

## What was done

**Audit** (read-only subagent; web-application + tdd methodology; deep pass over the session-013 changeset `808e783`): **0 CRITICAL · 0 HIGH · 0 MEDIUM · 3 LOW · 8 INFO** — all eight session-013 areas verified correct. Config instruction: documented no-op (seventh consecutive session). Deferred verdicts: migration journal do-later · CSP nonces do-later · Redis limiter never-until-multi-instance.

**Remediation (TDD, plan-014, every behavioral fix captured RED first):**
- **S14-L1** the drawer-close media query uses `(min-width: 64rem)` — Tailwind v4's `lg` is rem-based and media-query rem follows the *user's default font size*; the old `1024px` literal diverged from the CSS under any non-default root font, recreating the S13-L2 bug in the divergence band. Pinned by a declaration tripwire (new `tests/unit/header-source.test.ts`, candid NOTE: Playwright cannot emulate the browser's default font size).
- **S14-I1** when the drawer closes via the breakpoint, focus lands on the always-visible logo link instead of silently stranding on `<body>` (the hamburger is `display:none` at ≥lg). e2e-pinned via an activeElement poll.
- **S14-L2** the S13-L2 e2e now also counts `#mobile-drawer` DOM nodes — a role-locator count-0 cannot distinguish "unmounted" from "hidden by `lg:hidden`".
- **S14-I3** `optionalDollars` carries `.catch(undefined)` — the "bad values fall back" contract now holds for non-string inputs too (a number/null `min` used to make `parse` throw).
- **S14-L3 / I2 / I4 / I5** doc fixes: prune JSDoc §6→§9; README sitemap prose names both static routes (old itemization summed to 273); docs-counts sweep renamed "five docs"; DEPLOYMENT §1's HSTS parenthetical no longer mis-attributes the CSP dev/prod split.

**Verification — all exit-code-checked:** lint 0/0 · typecheck ✓ · typecheck:tests ✓ · **unit 112/112 (18 files)** · build cold ✓ · smoke 21/21 · **e2e 53/53 ×3** · sitemap **274** · screenshots **12/12** PIL-valid from the dev server.

**Deferred (documented):** migration journal · CSP nonces · Redis limiter · checkout-lock tx-body extraction · pre-hydration image-failure fallback · allowedDevOrigins automated gate · docs-counts DOCS-regex duplication · info pages keeping the layout's og · e2e summary-bucket sharing · shields badges decorative (documented) · int4 order-total headroom (no action).

---

Session 013 of the standing instruction. Checking workspace state and pulling the operator's new commit (`docs/session_13.md`):
Clone at `1bf5db8` (operator doc-only: session_13.md = my session-012 raw log). Browsers and PG data survived; node_modules and `.env` need recreation. Setting up the environment:
npm install OK; PG setup failed silently. Running with full output to diagnose:
The script paths are right — that was `initdb --version` output; the real failure is `pg_ctl start`. Checking the server log:
The data dir lost subdirectories in the reset (`pg_notify` missing). Checking what's absent vs. a healthy cluster:
The reset deleted only **empty** subdirectories — the actual data survived (base/ 31M with app_db 16384, pg_wal/ 17M). Recreating the standard empty dirs and restarting:
Nested empty dirs were pruned too. Recreating all nested empty dirs and retrying:
PG fully recovered — 22/242 intact, no reseed needed. Recreating `.env` and running the baseline gate:
E2E aborted early (11/52 in 19.9s). Checking the failure:
All failures are instant (1-2ms) — a fixture-level error, not test logic. Reading the actual error:
The fresh install resolved a Playwright version wanting build 1255; the surviving cache has 1200. Checking version state and installing the matching browser:
Playwright 1.65.1 wanted build 1255; the headless shell is now downloaded. Verifying the full chromium build too and rerunning e2e:
**Baseline fully green**: unit 108/108 · build cold · e2e 52/52 · smoke 21 · sitemap 274. Checking whether `npm install` touched the lockfile (the version resolution was odd), then launching the audit:
Lockfile is clean and pins 1.65.1 — no drift; the reset had simply pruned the 1255 browser builds, now restored. Baseline complete. Launching the session-013 audit subagent:
Audit complete: **0 CRITICAL / 0 HIGH / 2 MEDIUM / 2 LOW / 3 INFO** — session-012 changes all correct (9/9). The MEDIUMs: `optionalDollars` can 500 every listing page via `?max=1e308` (violates the fallback contract), and DEPLOYMENT §10 has stale session-008 counts outside the docs-counts census. Now browser verification, including live evidence for the lg-breakpoint drawer issue:
S12-I4 fix holding (`"false"` on reopen) and **S13-L2 confirmed live**: at 1440px the drawer lingers in the DOM with scroll still locked. Completing verification:
Escape recovery works (scroll unlocked). The `&&` chain broke mid-way — rerunning the remaining checks with tolerant chaining:
M-1 confirmed live — **HTTP 500** on both surfaces. The localhost nav check failed because I skipped the Products-expand step (the Sofa link lives in the collapsed submenu). Redoing properly:
Browser verification complete on both origins. Writing plan-013 and the RED batch:
Reading all RED-batch anchors in one pass:
All anchors read. Writing the RED batch:
All REDs confirmed (the stale-pattern sweep also caught DEPLOYMENT — the census extension works). Checking DEPLOYMENT's revision marker before writing the GREEN batch:
The marker is at lines 4-5 (and the intro's sample-facts list still names HSTS as "not applying here" — stale since session-009). Writing the GREEN batch:
Unit **110/110 (17 files)** GREEN. Rebuilding and running the full gate with live verification:
Full gate GREEN — e2e **53/53 ×3**, smoke 21/21, sitemap 274, and all three M-1 URLs now return **200** (the last grep just hit the HTML-escaped `&amp;`). Confirming the rendered content, then screenshots:
12/12 PIL-valid from the dev server. Now the docs sweep (PAD v2.12.0, SKILL v1.12.0, worklog Task 131, session_13.md record):
All green. Saving deliverables, committing, and pushing:
Committed `808e783`. Pushing via the SSH wrapper:
Push failed — authentication pre-flight. The `bin/ssh` shim survived the reset but its dependencies may not have. Debugging:
Confirmed — the reset wiped `paramiko` from the Python environment. Reinstalling and retrying the push:
In a virtualenv — installing directly into it:
# Session 013 — complete (pushed as `808e783` to `main` on `nordeim/nordhem-furnishing-store`, remote ref verified by the SSH wrapper)

**Environment recovery** — The sandbox was **recycled** before this session: the repo clone, node_modules, `.env`, the chromium-1255 browser builds, and the Python `paramiko` package were lost; the PG root tree + data dir, `bin/ssh` shim, scripts/ and the homenest reference clone survived. Recovered in place: fresh `git clone` at `1bf5db8` (operator doc-only — adds `docs/session_13.md`, the session-012 record), `npm install` (lockfile clean, zero drift), `.env` recreated from `.env.example`, `npx playwright install chromium`, and — notably — **the PG data dir repaired without a reseed**: the reset had pruned only its *empty* subdirectories (`pg_notify`, `pg_stat`, `pg_logical/snapshots`, `pg_multixact/*`, …), which I recreated with mode 700; the server then recovered with all data intact (22 / 242). Baseline gate fully green before any changes (unit 108/108 · build cold · e2e 52/52 · smoke 21/21 · sitemap 274), dev server verified live on both origins with the S12-I4 submenu reset holding; no Tailwind v4 bug.

**Audit** (read-only subagent, web-application + tdd skills; deep pass over session-012's `7d51eed`): **0 CRITICAL · 0 HIGH · 2 MEDIUM · 2 LOW · 3 INFO** — all nine session-012 areas verified correct. Config instruction: documented no-op (sixth consecutive session). Deferred verdicts unchanged: migration journal do-later · CSP nonces never · Redis limiter do-later.

**Remediation (plan-013, every fix RED→GREEN):**
- **S13-M1** the `optionalDollars` overflow bug — `?max=1e308` (Infinity cents) and `?max=1e17` (1e19 cents, over int8) 500'd every `/cat/*` and `/search` render (live-confirmed). Now bounded to safe integers ≤ int32-max cents; all three probe URLs verified **200** live, with the $21,474,836.47 boundary still filtering (unit-pinned).
- **S13-M2** DEPLOYMENT.md joined the docs-counts census (its §10 had sat at session-008 counts 90/14/44 for five sessions, outside the lockstep mechanism); §10 now reads 110/17/53.
- **S13-L1** DEPLOYMENT §1 states the six-header truth incl. HSTS (was self-contradicting §8); the stale "HSTS does not apply here" intro item dropped.
- **S13-L2** crossing the lg breakpoint now closes the mobile drawer through the normal path (it used to linger hidden-but-mounted with the scroll lock and focus trap live — live-confirmed at 1440px); e2e-pinned.
- **S13-I2** two cosmetic script nits fixed.

**Final gate (exit-code-checked):** lint 0/0 · typecheck ✓✓ · **unit 110/110 (17 files)** · build cold ✓ · smoke 21/21 · **e2e 53/53 ×3 consecutive** · sitemap **274** · screenshots **12/12 PIL-valid from the dev server**. Docs: PAD v2.12.0, SKILL v1.12.0 (§21 lessons), all count docs in lockstep, worklog Task 131, session_13.md record, plan-013, `.env.example` verified complete. The first push attempt failed because the reset had wiped `paramiko` (the ssh shim's transport); reinstalled it and the push verified cleanly. Key shredded after.

Saved for you in download/: [session-013_summary.md](/home/z/my-project/download/session-013_summary.md), [2026-11-21_session-013_remediation-plan.md](/home/z/my-project/download/2026-11-21_session-013_remediation-plan.md), [session_13.md](/home/z/my-project/download/session_13.md), [DEPLOYMENT.md](/home/z/my-project/download/DEPLOYMENT.md), [nordhem-furnishing-store_SKILL.md](/home/z/my-project/download/nordhem-furnishing-store_SKILL.md). The repo is clean at `/home/z/my-project/nordhem-furnishing-store`, `main` synced with origin at `808e783`.

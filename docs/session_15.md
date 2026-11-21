I'll start by setting up a TODO plan for this comprehensive task, then work through it systematically.
Session 014 of the standing instruction. Checking workspace state and pulling the operator's new commit:
Pulled `c5d7183` — doc-only, adds `docs/session_14.md` (the session-013 record). Workspace survived this time. Verifying environment and reviewing the new session doc:
Environment fully intact (node_modules, paramiko, chromium-1255, PG 22/242, .env). Running the baseline gate:
**Baseline fully green**: unit 110/110 · build cold · e2e 53/53 · smoke 21/21 · sitemap 274. All session-013 fixes hold. Launching the session-014 audit subagent:
Audit complete: **0 CRITICAL / 0 HIGH / 0 MEDIUM / 3 LOW / 8 INFO** — session-013 changes all correct. The LOWs: the matchMedia query hard-codes `1024px` while Tailwind v4's `lg` is `64rem` (diverges under a non-default user font size — the S13-L2 bug can recur in a band), the e2e drawer pin can't distinguish "unmounted" from `display:none`, and a stale §6 reference in the prune script. Now browser verification:
Drawer machine verified on 127.0.0.1. Now the localhost origin, the S13-L2 lg-crossing fix live, and the desktop check:
All browser checks green — the S13-L2 lg-closer is holding live (open+locked at 390px → unmounted+unlocked at 1440px). Checking the header markup for the focus-restore fix, then writing plan-014:
All context gathered. Writing plan-014:
All three REDs confirmed. Writing the GREEN batch:
Unit **112/112 (18 files)** GREEN. Rebuilding and running the full gate:
Full gate GREEN — e2e **53/53 ×3** with the hardened pins (logo-focus poll was RED, now GREEN). Capturing dev-server screenshots:
12/12 PIL-valid. Running the docs sweep (PAD v2.13.0, SKILL v1.13.0 §22, counts 112/18, worklog Task 132, session_14.md record):
All green. Saving deliverables, committing, and pushing:
Committed `2896613`. Pushing via the SSH wrapper:
# Session 014 — complete (pushed as `2896613` to `main` on `nordeim/nordhem-furnishing-store`, remote ref verified by the SSH wrapper)

**Environment** — The workspace survived this time (no reset): pulled `c5d7183` (operator doc-only — adds `docs/session_14.md`, the session-013 raw record). PG 22/242 intact, node_modules, paramiko, chromium-1255 and `.env` all present. Baseline gate fully green before any changes (unit 110/110 · build cold · e2e 53/53 · smoke 21/21 · sitemap 274), and the dev server verified live on both origins: the S12-I4 submenu reset holding, drawer navigation working, and the S13-L2 lg-crossing closer holding live (open + scroll-locked at 390px → unmounted + unlocked at 1440px). Desktop clean; no Tailwind v4 bug.

**Audit** (read-only subagent, web-application + tdd skills; deep pass over session-013's `808e783`): **0 CRITICAL · 0 HIGH · 0 MEDIUM · 3 LOW · 8 INFO** — all eight session-013 areas verified correct (boundary arithmetic traced end-to-end, effect/listener symmetry, census regexes, count lockstep by grep). Config instruction: documented no-op (seventh consecutive session). Deferred verdicts: migration journal do-later · CSP nonces do-later · Redis limiter never-until-multi-instance.

**Remediation (plan-014, every behavioral fix captured RED first):**
- **S14-L1** the drawer-close media query now uses `(min-width: 64rem)` instead of `1024px` — Tailwind v4's `lg` is rem-based and media-query rem follows the *user's default font size*, so the pixel literal diverged from the CSS under any non-default root font, recreating the S13-L2 bug in the divergence band. Pinned by a declaration tripwire (new `tests/unit/header-source.test.ts` with a candid NOTE — Playwright cannot emulate the browser's default font size).
- **S14-I1** focus continuity: when the drawer closes via the breakpoint, focus now lands on the always-visible logo link instead of silently stranding on `<body>` (the hamburger is `display:none` at ≥lg). e2e-pinned via an activeElement poll.
- **S14-L2** the S13-L2 e2e now also counts `#mobile-drawer` DOM nodes — a role-locator count-0 can't distinguish "unmounted" from "hidden by `lg:hidden`".
- **S14-I3** `optionalDollars` carries `.catch(undefined)` — the "bad values fall back" contract now holds for non-string inputs too (a number/null `min` used to make `parse` throw).
- **S14-L3 / I2 / I4 / I5** doc fixes: prune JSDoc §6→§9; README sitemap prose names both static routes; docs-counts sweep renamed "five docs"; DEPLOYMENT §1's HSTS parenthetical corrected.

**Final gate (exit-code-checked):** lint 0/0 · typecheck ✓✓ · **unit 112/112 (18 files)** · build cold ✓ · smoke 21/21 · **e2e 53/53 ×3 consecutive** · sitemap **274** · screenshots **12/12 PIL-valid from the dev server**. Docs: PAD v2.13.0, SKILL v1.13.0 (§22 lessons), all count docs in lockstep (112/18/53), worklog Task 132, session_14.md record, plan-014, `.env.example` re-verified (no env changes this session). Key shredded after the verified push.

Saved for you in download/: [session-014_summary.md](/home/z/my-project/download/session-014_summary.md), [2026-11-21_session-014_remediation-plan.md](/home/z/my-project/download/2026-11-21_session-014_remediation-plan.md), [session_14.md](/home/z/my-project/download/session_14.md), [DEPLOYMENT.md](/home/z/my-project/download/DEPLOYMENT.md), [nordhem-furnishing-store_SKILL.md](/home/z/my-project/download/nordhem-furnishing-store_SKILL.md). The repo is clean at `/home/z/my-project/nordhem-furnishing-store`, `main` synced with origin at `2896613`.

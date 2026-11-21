I'll continue this multi-phase task. Let me start by checking the workspace state and refreshing the repository.
Environment fully intact after the recycle (node_modules, PG running with 22/242 seeded, .env, chromium-1255, paramiko) — only the throwaway ssh shim is gone, recreated at push time. Running the baseline gate:
**Baseline fully green**: lint 0/0 · typecheck ✓✓ · unit 113/113 · build cold ✓ · smoke 26/26 · e2e 55/55 · sitemap 274 — every session-015 fix holds on the pulled tree. Now launching the audit subagent over the session-015 changeset (`ddde429`):
Audit verdict on session-015: **0 CRITICAL · 0 HIGH · 0 MEDIUM · 2 LOW · 1 INFO** — the close-funnel was traced complete (S12-I4 not regressed), smoke ordering safe, census non-vacuous, no import cycle. Remaining: four stale count lines (L1), the census's `.ts` blanket-benign hardening (L2), a SKILL typo (I1).

Now browser-verifying the mobile navigation on the dev server:
**Browser verification complete — no Tailwind v4 bug, mobile menu fully functional**: submenu reset on reopen (`aria-expanded=false`), scroll lock/unlock, Escape + focus restore, lg-crossing closer with logo focus, desktop mega-menu open/outside-close, zero console errors, no horizontal overflow, sitemap 274 live.

Now writing plan-016:
All four stale lines + the typo located. **RED first** — extending the docs-counts stale-pattern sweep so the four lines fail the census:
**RED captured** — the extended sweep now fails on exactly the three located stale shapes (the fourth, `(8 tests)`, is pinned via `spec.ts \((\d+) tests\)` and appears in the failure list at "…(3)"; the assertion message truncation hides it, but the earlier grep-located line `PAD:137` carries it). Verifying:
The `(8 tests)` line is `` `tests/e2e/mobile-navigation.spec.ts` (8 tests) `` — backtick-wrapped, so my regex needs to allow the backtick before the paren. Fixing the regex to catch it:
All **four stale lines now RED** exactly as the plan predicted. Now the GREEN batch — sweeping the four doc lines, the census allowlist refactor, and the SKILL typo:
S16-L1 GREEN (8/8) and S16-I1 fixed. Now S16-L2 — replacing the blanket extension benign set with an explicit filename allowlist:
Census hardened and green (6/6) — the filename allowlist covers exactly the 10 root configs that exist; any new root file of any extension now fails. Verifying the allowlist is truly exhaustive against the real root (no file silently relies on the old extension blanket):
All S16 fixes are GREEN. Now the full gate re-run:
**Full gate green post-remediation**: lint 0/0 · typecheck ✓✓ · unit 113/113 · build cold ✓ · smoke 26/26 · e2e 55/55 · sitemap 274. Now screenshots from the dev server, then docs:
`.env.example` verified — all 5 documented vars are read by the code exactly where documented; no env changes this session. Now the docs sweep (PAD v2.15.0, SKILL v1.15.0, worklog Task 134, session_16.md record):
The revision-block prose I just wrote quotes the old numbers in a live-tense shape the new regexes catch. Rewording the block so the historical quotes don't collide with the census:
All 113/113 green. Committing and pushing via the SSH wrapper:
# Session 016 — complete (pushed as `74d3c45` to `main` on `nordeim/nordhem-furnishing-store`, remote ref verified by the SSH wrapper, key shredded)

## What was done

**Environment & baseline** — Workspace survived the recycle; pulled `f226d9a` (operator doc-only — adds `docs/session_16.md`, the session-015 raw record). PG 17 was still running with 22/242 intact; node_modules, `.env`, chromium-1255, paramiko all present. **Baseline fully green before any change**: lint 0/0 · typecheck ✓✓ · unit 113/113 (18 files) · build cold ✓ · smoke 26/26 · e2e 55/55 · sitemap 274 — every session-015 fix holds.

**Browser verification (your key concern)** — Live on the dev server: drawer open → submenu expand → Escape/reopen with the **S12-I4 submenu reset holding through the new `close()` funnel**, scroll lock/unlock, focus restore, **lg-crossing closer + logo focus holding**, desktop mega-menu open + outside-pointerdown close, zero console errors, no horizontal overflow. **No Tailwind v4 display-utility bug** — the conditional-mount pattern holds. vitest/playwright configs audited sound (standing instruction: documented no-op, 10th session); sitemap/SEO verified live (274 canonical locs, robots disallows all private prefixes).

**Audit** (read-only subagent over the session-015 changeset `ddde429`, web-application + tdd + tailwind-patterns skills): **0 CRITICAL · 0 HIGH · 0 MEDIUM · 2 LOW · 1 INFO** — the close-funnel traced complete by code path (not just the passing e2e), smoke ordering checkout-safe with ~10× rate-limit margin, census non-vacuous, no import cycle, the `<main>` dispatchEvent e2e genuine (verified against playwright-core source).

**Remediation (plan-016, TDD):**
- **S16-L1** — RED first: the docs-counts sweep gained four count *shapes* the canonical regexes couldn't see, failing on exactly the four stale lines that survived session-015's "counts swept" commit (`CLAUDE.md` e2e row 53→55, `PAD` tree comments 112→113 and 21→26, drawer-pin note 8→10). GREEN after the sweep; a new `MOBILE_NAV_E2E = 10` constant pins the per-spec note. Every count claim in every doc is now regex-pinned in **all** its written shapes.
- **S16-L2** — the root census's `.ts`/`.mjs`/`.json` extension blanket (not scanner-inherently-benign — oxide scans `.ts` for class candidates) is replaced by `BENIGN_ROOT_FILES`, an explicit filename allowlist of the ten actual root configs; any NEW root file of any extension now fails the census. Exhaustiveness probe-verified against the real root.
- **S16-I1** — SKILL state-line `;;` typo fixed. One self-inflicted catch fixed in-flight: the new revision block quoted the old numbers in a census-matching shape — reworded, census 8/8 again.

**Final gate (exit-code-checked):** lint 0/0 · typecheck ✓✓ · unit **113/113 (18 files)** · build cold ✓ · smoke **26/26** · e2e **55/55** · sitemap **274** · screenshots **12/12** PIL-valid from the dev server. `.env.example` re-verified (all 5 vars read by the code exactly where documented; already tracked, included in the commit). Docs: PAD v2.15.0, SKILL v1.15.0, worklog Task 134, `session_16.md` record, plan-016.

**Deferred (documented):** migration journal · CSP nonces · Redis limiter (multi-instance) · `z.string().email()` Zod-4 soft-deprecation — verdicts recorded in plan-016.

Saved in `download/`: [session-016_summary.md](/home/z/my-project/download/session-016_summary.md), [2026-11-21_session-016_remediation-plan.md](/home/z/my-project/download/2026-11-21_session-016_remediation-plan.md). The repo is clean at `/home/z/my-project/nordhem-furnishing-store`, `main` synced with origin at `74d3c45`.

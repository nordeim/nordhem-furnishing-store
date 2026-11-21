# Nordhem Furnishing Store — Remediation Plan
**Date:** 2026-11-21 · **Session:** 016 · **Baseline commit:** `f226d9a` (main; operator doc-only — adds `docs/session_16.md`, the session-015 raw record — on top of the session-015 code changeset `ddde429`)

**Inputs:** docs/session_16.md (session-015 raw record), docs/session_15.md, plan-015, worklog Task 133, fresh audit (web-application + tdd + tailwind-patterns methodology; read-only subagent; `skills/` excluded; deep pass over the session-015 changeset `ddde429`), live browser verification of the mobile drawer state machine and SEO surfaces on the dev server.

## Baseline (verified this session, all exit-code-checked)
lint 0/0 ✓ · typecheck ✓ · typecheck:tests ✓ · unit **113/113 (18 files)** ✓ · build cold ✓ · smoke **26/26** ✓ · e2e **55/55** ✓ · sitemap **274** ✓. Environment survived the recycle intact (node_modules, PG 17 running with 22/242 seeded, `.env`, chromium-1255, paramiko); pulled `f226d9a`. Dev server verified live on 127.0.0.1: drawer open/close/reopen + submenu reset (S12-I4 holding through the S15-H1 funnel), Escape + focus restore, scroll lock/unlock, lg-crossing + logo focus (S13-L2/S14-L1/S14-I1 holding), desktop mega-menu open + outside-pointerdown close, zero console errors, no horizontal overflow. **No Tailwind v4 display-utility bug.**

## Audit summary
**0 CRITICAL · 0 HIGH · 0 MEDIUM · 2 LOW · 1 INFO.** The S15-H1 close-funnel was traced complete by code path (every leave-mobile-panel path routes through `close()`; the only remaining direct `setPanel(null)` is the desktop Products toggle, unreachable with the drawer mounted); smoke ordering checkout-safe with ~10× rate-limit margin; root census non-vacuous (a new `NOTES.md` fails it); no import cycle (cart-math is a leaf); the `<main>` dispatchEvent e2e genuinely exercises the document listener (verified against playwright-core). Deferred verdicts unchanged: migration journal do-later · CSP nonces do-later · Redis limiter never (until multi-instance) · I-2 `z.string().email()` soft-deprecation (migrate at next validation touch). Config instruction (vitest/playwright): audited sound — documented no-op, tenth consecutive session.

## Findings to fix (this session)

| ID | Sev | Finding | Fix |
|---|---|---|---|
| S16-L1 | LOW | **Four stale live-tense count lines survived the session-015 "counts swept" commit**: `CLAUDE.md:75` ("Playwright (53 tests, build first)"), `PAD:114` ("18 files / 112 tests"), `PAD:116` ("smoke.sh (21 checks)"), `PAD:137` ("mobile-navigation.spec.ts (8 tests)" — it has 10). The docs-counts census passes anyway because its regexes only pin the canonical table forms — the sweep literally cannot see these shapes. | Fix the four lines (55 / 113 / 26 / 10) AND extend the stale-pattern sweep in `tests/unit/docs-counts.test.ts` with the four missing shapes: `/\((\d+) tests?, build first\)/`, `# (\d+) files \/ (\d+) tests/`, `/smoke\.sh \((\d+) checks\)/`, `/spec\.ts \((\d+) tests\)/` (each checked against the constants — a wrong number becomes RED). Pin-strengthening born-GREEN after the doc fixes. |
| S16-L2 | LOW | **The root-census treats `.ts`/`.mjs`/`.json` as blanket-benign by extension, but the oxide scanner DOES scan `.ts` files for class candidates** — a future prose-bearing root `.ts` (scratch notes with class-shaped comments) would slip both the census (benign extension) and the poison scan (src-only), recreating the run-75 broken-build incident invisibly. Sound for today's tree (root `.ts` = pure configs); latent, not live. | Replace `BENIGN_ROOT_EXTENSIONS` with an explicit root-config FILENAME allowlist: `next.config.ts`, `playwright.config.ts`, `vitest.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `drizzle.config.json`, `tsconfig.json`, `tsconfig.tests.json`, `package.json`, `.env.example` (+ reasoned comments). A NEW root file of ANY extension then fails the census exactly like `NOTES.md` — the blanket-benign class disappears. RED first: temporarily verify the new test fails on a hypothetical (mental probe documented), then GREEN on the real tree. |
| S16-I1 | INFO | SKILL state line reads `26 smoke checks;;` (double semicolon, session-015's sed artifact). | Drop the extra `;`. |

**No action (documented):** the desktop Products toggle's direct `setPanel(null)` (line 161) — unreachable with the mobile drawer mounted, by traced analysis; adding a funnel detour there would be churn. `docs/ssh.sh` + `docs/ssh-wrapper.sh` stay (push runbook shims).

## Deliberately NOT changed (verdicts recorded)
- vitest.config.ts / playwright.config.ts — sound (tenth consecutive session); standing instruction remains a documented no-op.
- Migration journal · CSP nonces · Redis limiter · checkout-lock tx-body extraction · pre-hydration image-failure fallback · e2e summary-bucket sharing · int4 order-total headroom.
- Sitemap/SEO: 274 verified live (canonical roots only; robots disallows all private prefixes; Product JSON-LD present). No URL changes this session.

## Execution order (TDD)
1. **RED:** extend docs-counts stale-pattern sweep FIRST → run → the four stale lines go RED (the new regexes pin what the docs must become). This is a genuine RED: the test fails on the current tree.
2. **GREEN:** sweep the four doc lines (CLAUDE.md 53→55; PAD 112→113, 21→26, 8→10); the census allowlist refactor in `tailwind-scan-guard.test.ts`; the SKILL `;;` typo.
3. Full gate re-run (lint → typecheck → typecheck:tests → unit 113/113 → build cold → smoke 26/26 → e2e 55/55 → sitemap 274).
4. Screenshots from the dev server (BASE override) — 12/12 PIL-valid.
5. Docs: PAD v2.15.0 revision block + header, SKILL v1.15.0 (§23 unchanged this session — no new lesson class; version + state line only), worklog Task 134, session_16.md record, plan-016, `.env.example` re-verified (5 vars — no env changes this session).

## Evidence to capture
- S16-L1 RED: docs-counts run with the extended sweep failing on the four stale lines → GREEN after the sweep.
- S16-L2: the census still 6/6 green on the real tree with the filename allowlist (mental-probe note in the test comments: a new root `notes.ts` now FAILS).
- Full gate exit codes; sitemap 274; screenshots 12/12 from the dev server.

# Nordhem Furnishing Store — Remediation Plan
**Date:** 2026-11-21 · **Session:** 014 · **Baseline commit:** `c5d7183` (main; operator doc-only on top of `808e783`)

**Inputs:** docs/session_14.md (session-013 raw record), plan-013, worklog Task 131, fresh audit (web-application + tdd methodology; read-only subagent; `skills/` excluded; deep pass over the session-013 changeset `808e783`).

## Baseline (verified this session, all exit-code-checked)
lint 0/0 ✓ · typecheck ✓ · typecheck:tests ✓ · unit 110/110 (17 files) ✓ · build cold ✓ · e2e 53/53 ✓ · smoke 21/21 ✓ · sitemap 274 ✓. Workspace survived (no reset): PG 22/242 intact, node_modules, paramiko, chromium-1255, `.env` all present. Dev server re-verified live on BOTH origins: the S12-I4 submenu reset holding, drawer-link navigation, and **the S13-L2 lg-crossing closer holding live** (open + scroll-locked at 390px → unmounted + unlocked at 1440px). Desktop clean (menu hidden, no overflow, 16 cards) — no Tailwind v4 bug.

## Audit summary
**0 CRITICAL · 0 HIGH · 0 MEDIUM · 3 LOW · 8 INFO.** All eight session-013 areas verified correct (boundary arithmetic traced end-to-end, effect/listener symmetry, census regexes, doc lockstep by grep). Deferred verdicts unchanged: migration journal do-later · CSP nonces do-later · Redis limiter never (until multi-instance). Config instruction: audited sound — documented no-op (seventh consecutive session).

## Findings to fix (this session)

| ID | Sev | Finding | Fix |
|---|---|---|---|
| S14-L1 | LOW | **The drawer-close media query hard-codes `1024px` while Tailwind v4's `lg` is `64rem`.** Media-query `rem` follows the *user's* default font size (a common a11y setting); with a 14px root the CSS hides the drawer at 896px but the JS listener only fires at 1024px — in that band the S13-L2 bug (hidden-but-mounted drawer, live scroll lock + focus trap) recurs. Not exercisable in Chromium (Playwright cannot emulate the browser's default font size), so the pin is a declaration tripwire (the repo's accepted source-pin family) + behavior stays pinned by the existing e2e at default font size. | `header.tsx`: `matchMedia("(min-width: 64rem)")`. RED: new `tests/unit/header-source.test.ts` tripwire asserting the rem query and the absence of any `matchMedia("…Npx")` literal, with a candid NOTE. |
| S14-L2 | LOW | **The S13-L2 e2e pin can't distinguish "unmounted" from "hidden by `lg:hidden`".** `getByRole("dialog")` count-0 also passes when the element is merely `display:none` (role locators exclude hidden subtrees from the a11y tree); the overflow poll is what actually discriminates today. | Harden the S13-L2 test with `expect(page.locator("#mobile-drawer")).toHaveCount(0)` — a CSS locator counts DOM nodes regardless of visibility. Pin-strengthening (already passes; not a RED). |
| S14-L3 | LOW | Stale section pointer: the prune script's JSDoc says "see docs/DEPLOYMENT.md §6" but pruning is documented in **§9**. | §6 → §9. |
| S14-I1 | INFO | **Focus restore is a silent no-op when the drawer closes via the breakpoint** — the hamburger is `display:none` at ≥lg, so `menuButton?.focus()` strands focus on `<body>`. | In the scroll-lock cleanup, when `(min-width: 64rem)` matches, focus the always-visible logo link (`a[aria-label^="IKEA logotype"]` via headerRef) instead. RED: extend the S13-L2 e2e with an activeElement poll (currently null/body → RED vs the logo's aria-label). |
| S14-I2 | INFO | README's sitemap itemization says "home + 8 info pages + 22 + 242 = 274" — that sums to 273; the static set is 2 (`/` + `/ikea-family`), as DEPLOYMENT §8 correctly states. | Prose: "home + IKEA Family + 8 info pages …". |
| S14-I3 | INFO | **`optionalDollars` has no `.catch`** — its lenient "bad values fall back" contract currently holds only because searchParams always yield strings; a reused schema would throw on a non-string `min`. Sibling fields (`sort`, `page`) already carry `.catch`. | Append `.catch(undefined)` to the chain. RED: unit case `parse({ min: 5, max: null })` → both `undefined` (currently throws). |
| S14-I4 | INFO | docs-counts sweep test still says "four docs"; the DOCS array has five since session-013. | Rename to "five docs". |
| S14-I5 | INFO | DEPLOYMENT §1's parenthetical "(HSTS; the dev/prod split is in §8)" attaches the CSP's dev/prod split to HSTS, which is mode-invariant. | Drop the misplaced clause — "(HSTS)". |

**No action (documented):** I-6 commit-message boundary typo (history, in-code comment correct) · I-7 shields badges are decorative and hand-maintained (counts agree today) · I-8 int4 order-total headroom ~15× under max with the current catalog.

## Deliberately NOT changed (verdicts recorded)
- vitest.config.ts / playwright.config.ts — audited sound (seventh consecutive session); the standing instruction remains a documented no-op.
- Migration journal (do-later) · CSP nonces (do-later) · Redis limiter (never until multi-instance) · checkout-lock text-pin tradeoff · pre-hydration image-failure fallback · info pages keeping the layout's og · docs-counts DOCS-regex duplication · allowedDevOrigins manual-probe coverage · e2e summary-bucket sharing · source-text tripwires as a family (the new L1 pin joins it with a NOTE).
- Sitemap/SEO: 274 verified; no URL changes this session.

## Execution order (TDD)
1. **RED batch:** header-source tripwire (RED — source has `1024px`) · optionalDollars non-string fallback it (RED — parse throws) · S13-L2 e2e extension with the logo-focus poll (RED — activeElement is body). The `#mobile-drawer` count-0 pin goes in as hardening (passes).
2. **GREEN batch:** `(min-width: 64rem)` in the closer effect + logo-focus branch in the cleanup · `.catch(undefined)` · prune §9 · README sitemap prose · docs-counts "five docs" · DEPLOYMENT "(HSTS)".
3. Full gate: lint → typecheck → typecheck:tests → unit (112/18 expected) → build cold → smoke → e2e ×3 (53/5 expected) → sitemap 274.
4. Screenshots from the dev server (BASE override) — 12/12 PIL-valid; `.env.example` re-verified (no env changes this session).
5. Docs: PAD v2.13.0 revision block + header, SKILL v1.13.0 (§22 lessons + state line), AGENTS/CLAUDE/README/PAD/DEPLOYMENT counts (112/18/53), worklog Task 132, session_14.md record, plan-014, docs-counts constants.

## Evidence to capture
- S14-L1 RED: tripwire vs `1024px` source → GREEN with `64rem`.
- S14-I1 RED: e2e activeElement poll (null) → GREEN (logo aria-label).
- S14-I3 RED: unit parse-throws → GREEN (both undefined).
- Full gate exit codes; sitemap 274; screenshots 12/12 from the dev server; DB untouched.

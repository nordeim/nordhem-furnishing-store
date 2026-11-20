# Nordhem Furnishing Store — Remediation Plan
**Date:** 2026-11-20 · **Session:** 004 · **Baseline commit:** `cf20d0e` (main)
**Inputs:** docs/session_3.md, worklog Tasks 112–121, plans/session-003, fresh audit (web-application skill methodology; skills/ excluded). homenest-store-s patterns re-checked where relevant.

## Baseline (verified this session)
lint ✓ · typecheck ✓ · typecheck:tests ✓ · unit 70/70 ✓ · build ✓ · smoke 21/21 ✓ · sitemap 267 ✓ · **e2e 1 failed + 21 passed** (see H-1 — this falsifies session-003's "22/22 ×3" claim, which was a verification-method bug: `grep -E "passed|failed" | tail -1` showed only the trailing "21 passed" line).

## Session-003 claim correction (process debt, must be recorded)
- worklog Task 121 / session_3.md / SKILL v1.2.0 / PAD v2.2.0 / commit 1d36ec5 all say "e2e 22/22 ×3 consecutive green". FALSE: the new outside-click pin (storefront.spec.ts:74) clicks the sr-only 1×1px `h1` and has failed deterministically since it landed (4/4 audit reproductions + direct confirmation). Root cause of the false claim: grepping the last line of Playwright output instead of checking the exit code / full tally.
- Fix the gate process: every e2e verdict this session is taken from the exit code + full tally block, never a grepped line. Record the correction in PAD v2.3.0, SKILL v1.3.0 lessons, and worklog Task 122.

## Audit summary (session-003 changes + deferred items)
0 CRITICAL · 1 HIGH · 1 MEDIUM · 4 LOW · 9 INFO. All session-003 production-code changes verified genuinely correct and regression-free (clientKey depth-0, summary in-flight guard incl. all five focus-trap sub-checks, sitemap logging, pool listener, smoke checks, suffix utilities — live-verified). The failures are in the NEW TEST and one component ref.

## Findings to fix (this session)

| ID | Sev | Finding | Fix |
|---|---|---|---|
| H-1 | HIGH | Outside-click e2e pin never passed: clicks `h1` that is `sr-only` (1×1px box) — pointer events intercepted by `<article>`/sticky header; 30s timeout, deterministic fail | Click a genuinely visible outside target (audit live-verified: `heading "Let the Christmas decorating begin"`); no `force:true` |
| M-1 | MED | Popover toggle broken: `buttonRef` (inside the hotspot `.map()`) holds only the LAST-rendered button — clicking the open hotspot's own button fires outside-close then stale-true re-open (live-probed flicker `true→false→true`); same for its inner `<span>` | Replace the shared-ref comparison with `event.target.closest("[data-hotspot-open]")` on the open hotspot's container; e2e pin for own-button toggle written FIRST (RED) |
| L-4 | LOW | Fragile popover locator: `[aria-label]` + hasText matches the carousel region/ul ancestors too (`.first()` masks it) | `data-testid="hotspot-popover"` + scope both popover tests to it |
| I-9 nit | LOW | `aria-label` on the role-less popover div is not exposed to the a11y tree | `aria-labelledby` → the popover's name `<p id>`; static id is safe (only one popover open at a time) |
| L-1 | LOW | Doc counts stale in the SAME commit that updated unit counts: e2e "18 tests" / smoke "19 checks" in AGENTS.md:15,18 · CLAUDE.md:75,81,82 · README.md:84 · PAD:115,116,190,191,237 | Sweep to e2e 22 / smoke 21 (with H-1 fixed, 22/22 is genuinely true) |
| L-2 | LOW | DEPLOYMENT.md §5 "All API limiters" omits favourites (120/min, verified in favourites/route.ts:10) | Add it |
| L-3 | LOW | Orphan cart rows (26 live; first-request race + abandoned carts; no FK to sessions — cookie-only UUIDs) | `scripts/prune-abandoned-carts.mjs` (node + pg; deletes cart_items/favourites rows untouched >180d, matching the cookie maxAge) with `--dry-run`; live-verified by backdating a row; documented in DEPLOYMENT.md §6 (operator-cron, not in the checkout tx — no hot-path scan, no checkout-failure coupling) |
| I-2 nit | INFO | Outer JSDoc of `clientKey` doesn't mention the depth-0 posture (inline comments do) | One-line JSDoc addition |

## Deferred again (documented)
- CSP header (~½ day middleware+nonce threading; current surface small: no user HTML, Zod at boundaries, JSON-LD escaped) — standing known limitation
- Migration journal (needs baselining of existing DBs) — standing known limitation
- Unused icons/tokens (tree-shaken, zero runtime cost — design palette)
- SearchAction → /search vs robots (Google retired sitelinks searchbox; IKEA parity; inert either way)
- sitemap logError drops the stack (message-only is adequate for the fallback signal)

## Execution order (TDD)
1. H-1: fix the outside-click target → single-test run must pass (this is the RED→GREEN: the test was born failing)
2. M-1: write own-button-toggle e2e pin (RED: live-probed flicker) → `data-hotspot-open` + closest fix (GREEN) → L-4 locator hardening (`data-testid`) + I-9 `aria-labelledby` in the same component touch → re-run both popover tests
3. L-3: prune script + live backdate verification + DEPLOYMENT.md §6 note
4. L-1/L-2/I-2: doc sweeps + JSDoc
5. Full gate with exit-code-checked verdicts: lint → typecheck → typecheck:tests → unit 70/70 → build → smoke 21/21 → **e2e 22/22 ×3 (verify via exit code, not grep)**
6. Screenshots refresh (popover change is behavioral; re-capture and commit only real diffs)
7. Docs sweep: PAD v2.3.0 (revision block + correction note), SKILL v1.3.0 (§12 lessons incl. the verification-method lesson, state line), worklog Task 122 (honest correction), session counts
8. Commit + SSH push to main

## Evidence to capture
- Single-test H-1 pass; M-1 RED trace (flicker) → GREEN; prune backdate before/after psql counts; e2e ×3 with `echo $?`-checked exit codes; final counts: unit 70, e2e 22/22, smoke 21/21, sitemap 267

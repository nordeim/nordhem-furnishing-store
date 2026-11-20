The workspace survived (repo clean at `c9c5e18`, PostgreSQL up with 242 products). There's a new remote commit `5c86ef8` — pulling now:
Session 007 begins. The operator's new commit `5c86ef8` is doc-only: added `docs/session_7.md` (the session-006 record as this session's context), deleted the consumed `docs/sample_DEPLOYMENT.md`, and tweaked `prompt-to-review-4.md`. No code changes. Setting up the plan:
Docs are in lockstep with the codebase (76 unit / 25 e2e / sitemap 276 / state lines all match). Stale servers stopped. Running the baseline gate:
**Baseline fully green** — all session-006 fixes verified live (sitemap 276, unknown → 404, rotating `x-real-ip` → 429 at request 10). Docs align with the tree. Launching the audit subagent for session 007:
The main add-to-cart button uses text content, not aria-label (only related-product buttons have labels). Clicking by ref:
Plan written and validated against the codebase. **Progress update:** the audit found no critical/high issues — session-006's fixes all hold. The real work this session is: 17 dead footer links (fallout of last session's soft-404 fix), an `x-forwarded-host` CSRF-gate inconsistency, stale doc counts (73/23/6-tables), an empty sitemapped collection, plus two long-deferred items now due (CSP header, axe-core a11y gate). Executing TDD — M-1 RED pins first:
**M-1 GREEN (15/15).** Now M-2 — the link-census RED test, then the RULES extension:
Now writing the M-2 link-census RED test:
**RED confirmed — exactly the 17 dead links.** Now the GREEN — extending the RULES:
**M-2 GREEN — unit suite now 79/79 (12 files).** Progress: M-1 (CSRF gate) and M-2 (17 dead links) are fixed with RED→GREEN pins. Continuing with M-3 (docs-counts guard) and the remaining batch. Writing the docs-counts RED test:
**docs-counts RED as expected (5 failing).** Now the doc sweep to GREEN — I'll do it with a persisted script covering M-3, L-5, and later the remaining doc updates:
The first run already fixed README (the MISS is just re-running on fixed text). The only remaining "73" is inside a historical revision-block sentence, which should stay as-is. Let me make the script idempotent and finish:
The remaining failures are my test's regexes not matching the docs' actual phrasings ("79 unit / 25 e2e" has no word "tests"; AGENTS says "21-check HTTP smoke" differently; PAD says "79 tests / 12 files" without parens). Adjusting the test to match the real phrasings:
**M-3 GREEN — docs-counts guard in place (unit now 84/84, 13 files).** Now CSP + axe-core + the code batch. First installing the axe dependency and reading the files I need to edit:
Now L-2 (heading order), M-4 (recycled-materials), L-8 (icons) and the compose header. Locating the listing/favourites/seed/icons anchors:
A syntax error slipped into listing-view.tsx (my h2 insertion hit the wrong nesting level). Fixing:
All static checks green. Now the e2e additions (CSP pin + axe sweep + og/404-title assertions) and the reseed:
Now the axe-core a11y spec:
Reseeded: **22 categories** (was 23 — the empty recycled-materials collection is gone), 242 products. Now the full e2e with the new specs:
The axe rule `label-content-name-mismatch`: the aria-label says "Save BILLY / OXBERG…" but visible text says only "Save to shopping list" — the accessible name must start with the visible text. Fixing by moving the product name into the visible span:
**e2e 38/38** (25 previous + 6 seo-platform additions + 8 axe sweep − 1 overlap = 38; the axe fix worked). Now smoke + sitemap + live probes, then screenshots and docs:
All live probes pass: CSRF pairing now 403s, health is no-store, CSP header present, `/planners` resolves, sitemap **275** (276 − the dropped empty collection). Verifying screenshots and finishing the docs:
Line 281 is a historical revision block — stays as-is. Making the remaining doc script fully idempotent and running it, then the final gate in batches:
**Full gate green**: lint 0/0 · typecheck ✓ · typecheck:tests ✓ · unit 84/84 · e2e 38/38 ×3 · smoke 21/21 · sitemap 275. Committing and pushing now:
Session 007 is complete and pushed. Final report:

## Session 007 — complete (pushed as `9df3266` on `main`, remote ref verified by the SSH wrapper)

**Workspace & alignment** — Pulled the operator's doc-only `5c86ef8` (adds session_7.md, deletes the consumed sample_DEPLOYMENT.md). PostgreSQL intact from the surviving data dir (242 products / 23 categories / 7 tables). All docs validated against the tree; all five session-006 fixes re-verified holding live (rotating `x-real-ip` 429s at request 10, unknown paths 404, `FOR UPDATE OF cart_items`, scanner guard, compose loopback). `skills/` excluded from all checking/testing/compilation.

**Baseline gate** (exit-code-checked): lint 0/0 · typecheck ✓ · typecheck:tests ✓ · unit 76/76 · build cold ✓ · smoke 21/21 · e2e 25/25 · sitemap 276.

**Audit** (read-only subagent using web-application + tdd skills, plus live probes): 0 CRITICAL · 0 HIGH · **4 MEDIUM · 8 LOW · 10 INFO**, plus verdicts on every long-deferred item — CSP and axe-core judged **do-now**, migration journal and shared-store limiter do-later, HSTS/token cleanup/SearchAction/setCartQuantity-LWW never/accept. The vitest/playwright configs were audited and judged sound, so the standing "modify the config files" instruction was a deliberate no-op — the genuine gaps were test *content*, not config (I said so rather than churning working config).

**Browser verification** (agent-browser, 390×844 + 1440×900): mobile drawer state machine fully passes (open, submenu → navigate → unmount, Escape, close + focus restore + scroll unlock); hero popover toggle; combobox ArrowDown; full manual cart→checkout→order→track round-trip (right email found / wrong email single generic error). No Tailwind v4 display-utility bug.

**Remediation (TDD, plan-007, each RED→GREEN):**
- **M-1**: `hasForeignOrigin` now honors `x-forwarded-host` only behind declared proxy trust — the last client-authorable header in the trust paths. Live pairing probe (`Origin` + `x-forwarded-host` both evil) went 404-pass → **403**.
- **M-2**: **17 dead footer/home links repaired** — the session-006 soft-404 fix was correct but the RULES covered only part of the footer long tail; broad prefixes added, and a new `link-census.test.ts` censuses every rendered internal href so dead links can't return. Garbage paths still 404.
- **M-3+L-5**: doc counts are now **machine-enforced** (`tests/unit/docs-counts.test.ts`) — it went RED on exactly the stale sites sessions 005/006 missed, then GREEN after the sweep.
- **CSP (long-deferred, now live)**: header added with the audited allowlist; e2e-pinned; JSON-LD scripts verified still executing.
- **axe gate (long-deferred, now live)**: `@axe-core/playwright` sweep of 8 surfaces at serious/critical — it immediately caught and I fixed a label/name mismatch on the favourite button plus the h1→h3 heading skips on /cat, /search, /favourites.
- **M-4**: the empty `recycled-materials-700324` collection dropped (0 of 242 products ever matched the tagging heuristic, yet it was linked and sitemapped) — categories 23→22, sitemap 276→**275**, DB reseeded and verified.
- **L-1/L-3/L-4/L-6/L-8/I-10**: category meta descriptions, `/api/health` no-store, og:image + twitter:card on products, 404 page title, unused icons deleted, compose header renamed — all e2e-pinned or live-verified.

**Final gate** (exit-code-checked): lint 0/0 · typecheck ✓ · typecheck:tests ✓ · **unit 84/84 (13 files)** · build cold ✓ · smoke 21/21 · **e2e 38/38 ×3** · sitemap 275 · screenshots 12/12 PIL-valid, refreshed in `docs/screenshots/`. Docs updated: PAD v2.6.0, SKILL v1.6.0 (§15 lessons), DEPLOYMENT.md (CSP paragraph, direct-exposure ceiling note, counts), AGENTS/CLAUDE/README, worklog Task 125, session_7.md, plan-007. `.env.example` re-verified in lockstep and included in the commit.

**Deferred (documented in plan-007 + PAD):** migration journal · shared-store limiter · HSTS · SearchAction parity · setCartQuantity LWW · CSP nonces.

Saved for you under download/: [session-007_summary.md](/home/z/my-project/download/session-007_summary.md), [2026-11-20_session-007_remediation-plan.md](/home/z/my-project/download/2026-11-20_session-007_remediation-plan.md), [DEPLOYMENT.md](/home/z/my-project/download/DEPLOYMENT.md), [session_7.md](/home/z/my-project/download/session_7.md). The repo is at `/home/z/my-project/nordhem-furnishing-store` (clean tree, `main` synced with origin). Send a follow-up message anytime to continue from the saved state.

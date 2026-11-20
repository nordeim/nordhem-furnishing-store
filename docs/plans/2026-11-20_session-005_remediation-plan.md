# Nordhem Furnishing Store — Remediation Plan
**Date:** 2026-11-20 · **Session:** 005 · **Baseline commit:** `d42a761` (main)
**Inputs:** docs/session_4.md, worklog Tasks 112/119–122, plans/session-004, fresh audit (web-application + tdd skill methodology; live curl/browser/psql probes; skills/ excluded). homenest-store-s patterns re-checked where relevant (rate-limit proxy-depth posture, Tailwind v4 mobile-nav discipline, e2e exit-code verification).

## Baseline (verified this session, all exit-code-checked)
lint ✓ (1 pre-existing warning, see L-5) · typecheck ✓ · typecheck:tests ✓ · unit 70/70 ✓ · build ✓ (cold .next) · smoke 21/21 ✓ · **e2e 23/23 ×3 consecutive runs** · sitemap 267 locs ✓ · DB 242 products / 23 categories. All session-004 claims verified TRUE on the fresh clone (popover marker fix, outside-click pin, prune script).

## Audit summary (session-004 changes + whole codebase)
0 CRITICAL · 2 HIGH · 4 MEDIUM · 9 LOW · 10 INFO. Session-004 production changes verified genuinely correct. The two HIGH items are newly-surfaced (H-1 live-verified this session; H-2 by code-read — the audit lineage had not previously exercised the concurrency posture of `placeOrder`).

## Findings to fix (this session)

| ID | Sev | Finding | Fix |
|---|---|---|---|
| H-1 | HIGH | `clientKey` default `TRUSTED_PROXY_DEPTH=1` trusts a single client-supplied XFF hop on direct exposure — live-verified: 12/12 rotating spoofed XFFs bypassed the checkout limiter (vs 429 at request 11 without). `.env.example` even advises "leave unset on direct exposure" — the unsafe default. | Fail closed: **unset → depth 0 (XFF ignored entirely)**; trust must be opted into via explicit `TRUSTED_PROXY_DEPTH≥1`. Update unit pins (RED first), `.env.example`, AGENTS/CLAUDE/PAD/DEPLOYMENT docs. |
| H-2 | HIGH | Checkout double-order race: `placeOrder` tx SELECTs cart lines without a lock; two concurrent same-session checkouts both read non-empty lines → two orders (both valid, cart deleted twice). | Lock the session's cart rows at the head of the transaction: `SELECT … FOR UPDATE` on cart_items (drizzle `.for("update")`), so the second tx sees empty_cart after the first commits. Unit pin on the SQL shape (text assertion — pure-seam discipline, no DB in unit tests). |
| M-3 | MED | `src/db/index.ts` exports `pool` with zero importers — invites bypassing the one-construction rule (HMR-safe global). | Remove the dead export; keep `db` as the sole handle. |
| M-4 | MED | Search combobox lacks ArrowDown/ArrowUp focus management into suggestions (WAI-ARIA 1.2 combobox pattern). | Add ArrowDown/ArrowUp/Escape handling in `search-box.tsx` (ArrowDown → first suggestion link, Escape → close + revert to typed value). Pinned by a new mobile-safe e2e check in the storefront spec. |
| L-1 | LOW | `AGENTS.md:15` "Playwright (18 tests)" — actual 23. | Sweep to 23. |
| L-2 | LOW | `README.md:30` "Vitest, 52 tests" — actual 70. | Sweep to 70. |
| L-3 | LOW | `PAD:137` "mobile-navigation … (6 tests)" — actual 8. | Sweep to 8. |
| L-4 | LOW | Scanner guard + its test pin exclude `../../ely-beauty_SKILL.md` — a file that does not exist (pre-rewrite leftover). | Remove the stale guard line + the test pin entry (guard stays complete for every existing root file). |
| L-5 | LOW | `header.tsx:91` `react-hooks/exhaustive-deps` warning: `menuButtonRef.current` read in effect cleanup. | Copy the ref to a local inside the effect (the documented React pattern); warning goes to zero. |
| L-6 | LOW | `prune-abandoned-carts.mjs` — no guard note that a small `MAX_AGE_DAYS` deletes recent active carts. | One comment line documenting the footgun (dry-run default already mitigates). |
| L-7 | LOW | Indexable info pages (`/offers`, `/rooms`, `/stores`, `/customer-service/*`, `/ideas`, `/new`, `/campaigns/christmas`, `/product-guides/sustainable-products`) are absent from the sitemap — 200-status, indexable, linked from nav/footer, but undiscoverable. | Add the 9 canonical info routes to `sitemap.ts` staticRoutes (weekly, 0.4); pin in `seo-routes.test.ts` (RED first). Live count goes 267 → 276. |
| L-8 | LOW | No `alternates.canonical` on param'd listing/search pages — sort/page query strings accumulate duplicate signals. | Add `alternates: { canonical: ... }` in cat/p/search `generateMetadata` (canonical = the clean path, no query). |

## Deferred again (documented, unchanged)
- CSP header (~½ day middleware+nonce threading) — standing known limitation.
- Migration journal (needs DB baselining) — standing known limitation.
- Unused icons/tokens (tree-shaken, zero runtime cost).
- SearchAction → /search vs robots (Google retired sitelinks searchbox; IKEA parity; inert).
- In-memory limiter single-instance (ADR-001 consequence).
- M-1 setCartQuantity last-writer-wins (no money impact; totals always server-derived), M-2 per-orderNo track sub-bucket (compounded by H-1; fixed at the key-derivation layer instead), L-9 toggleFavourite read-then-write race (guarded by button disabling) — accepted, documented.

## Execution order (TDD — red before green, one slice at a time)
1. **H-1**: update `tests/unit/http.test.ts` pins FIRST (unset → "unknown" for single-hop XFF; explicit depth still honored) → RED → flip `trustedProxyDepth()` default to 0 → GREEN → `.env.example` + doc sweep (AGENTS env row, CLAUDE error-handling row, PAD §6, DEPLOYMENT §5). Live re-probe: rotating XFF now 429s at request 11.
2. **H-2**: write the SQL-shape unit pin (`shopping` source carries `.for("update")` on the cart SELECT, same text-assertion style as seo-routes) → RED → add `.for("update")` → GREEN.
3. **L-7**: extend `seo-routes.test.ts` PUBLIC_ROUTES with the info families → RED → add 9 routes to `sitemap.ts` → GREEN → live sitemap count 276.
4. **L-8**: add `alternates.canonical` to cat/p/search generateMetadata; no unit pin needed (metadata shape asserted in seo-platform e2e JSON-LD/title checks already).
5. **M-4**: add ArrowDown/ArrowUp/Escape to `search-box.tsx`; extend the storefront e2e suggestions test with a keyboard-nav assertion.
6. **M-3**: remove dead `pool` export; **L-4**: drop stale guard line + test pin; **L-5**: ref-copy in header effect; **L-6**: prune-script comment.
7. **L-1/L-2/L-3 + counts sweep**: AGENTS 18→23, README 52→70, PAD 6→8; re-verify every count against reality (`npx playwright test --list`, `vitest list`).
8. Full gate with exit-code-checked verdicts: lint (0 errors 0 warnings) → typecheck → typecheck:tests → unit (70+3 new = 73) → build (cold) → smoke 21/21 → **e2e 23/23 ×3** → sitemap 276 live.
9. Screenshots refresh via `scripts/capture-screenshots.mjs` against :3100; commit only real diffs.
10. `.env.example` final review (matches the new TRUSTED_PROXY_DEPTH semantics).
11. README expansion per `skills/readme-md/SKILL.md` (badges, quick start verification, env table, troubleshooting).
12. Docs sweep: PAD v2.4.0 revision block, SKILL v1.4.0 §13 lessons + state line, AGENTS/CLAUDE counts, worklog Task 123, docs/session_5.md.
13. Commit + SSH push to main via `docs/ssh_git_wrapper_v3.py` (key-file + `--remote git@github.com:nordeim/nordhem-furnishing-store.git`), exit-code verified.

## Evidence to capture
- H-1 RED (2 failing pins) → GREEN; live rotating-XFF probe 429s post-fix.
- H-2 RED pin → GREEN (`.for("update")` in the compiled source).
- L-7 RED → GREEN; live `curl sitemap.xml | grep -c "<url>"` = 276.
- Lint output 0 warnings post-L-5.
- e2e ×3 exit-code checked; unit counts; smoke 21/21.
- Screenshot set 12/12 PIL-valid.

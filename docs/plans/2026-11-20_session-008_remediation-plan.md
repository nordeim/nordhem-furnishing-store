# Nordhem Furnishing Store — Remediation Plan
**Date:** 2026-11-20 · **Session:** 008 · **Baseline commit:** `ef35f32` (main)

**Inputs:** docs/session_8.md (session-007 record), plan-007, worklog Task 125, fresh audit (web-application + tdd skill methodology; read-only subagent + live curl/psql/agent-browser probes; skills/ excluded), homenest-store-s stack patterns (unchanged lineage).

## Baseline (verified this session, all exit-code-checked)
lint 0/0 ✓ · typecheck ✓ · typecheck:tests ✓ · unit 84/84 (13 files) ✓ · build cold ✓ · smoke 21/21 ✓ · e2e 38/38 ✓ · sitemap 275 ✓. All session-007 fixes re-verified holding live (CSRF pairing 403; unknown-path 404; `/planners` 200; CSP header on `/`; axe suite green). Workspace was reset (re-clone; `.env` restored from `.env.example`; chromium reinstalled); PostgreSQL restored from the surviving data dir — the recycle pruned `pg_logical/mappings` this time (session-006's known failure mode).

## Audit summary
0 CRITICAL · 0 HIGH · **4 MEDIUM · 6 LOW · 7 INFO**. Deferred verdicts: no config changes warranted (isolate:false is a nicety, rejected); migration journal do-later (first schema change); SearchAction parity trivial do-now; CSP nonces do-later; Redis limiter / HSTS / LWW never (documented).

## Findings to fix (this session)

| ID | Sev | Finding | Fix |
|---|---|---|---|
| S8-M1 | MED | Favourite button **active state** violates Label-in-Name: aria-label `Remove ${name} from shopping list` vs visible text `Saved ${name} to shopping list` (live-confirmed). The axe sweep never sees it (static pages only, unfavourited). | Align active visible text with the aria-label (`Remove ${name} from shopping list` — or keep "Saved" in both; pick aria-label wording to match visible). RED: extend accessibility.spec.ts with state-scans (favourited product page, drawer-open, cart-with-items, search-suggestions-open) — fails with label-content-name-mismatch today. GREEN: the label fix. |
| S8-M2 | MED | Broad RULES prefixes render an **unbounded indexable thin-content surface**: `/customer-service/<garbage>` → 200 with layout-default meta, no canonical, no unique description (live-confirmed). | Catch-all `generateMetadata`: unique `description` derived from rule lead + slug title; `alternates.canonical` → prefix root for non-exact matches (long tail collapses); exact prefix keeps self-canonical. RED unit on `resolveInfoPage` (new fields) + e2e pin (`/customer-service/faq` canonical → `/customer-service`, description ≠ layout default). |
| S8-M3 | MED | Stale live-tense doc claims: "No CSP yet" ×4 (README:102, PAD:90/181/217); seed counts "23 categories / 2 synthetic collections" ×2 (README:57, DEPLOYMENT:148-150 — internally contradicts their own 22/275 elsewhere); DEPLOYMENT revision line still "session 006"; SKILL.md:11 "sitemap 276 locs" (D-1). | One doc-sweep commit; PAD known-issues CSP row → landed with `unsafe-inline` residual noted. |
| S8-M4 | MED | `docs-counts.test.ts` scope gap — doesn't cover SKILL/DEPLOYMENT or sitemap/category counts (exactly where drift recurred). | Extend: add `SITEMAP_URLS = 275`, `CATEGORIES = 22` constants + SKILL/DEPLOYMENT entries. RED on the stale sites above → GREEN via the sweep. |
| S8-L1 | LOW | link-census trusts `/cat/`+`/p/` prefixes without existence checking. | Census imports the catalog (categories + product slugs) and asserts every censused `/cat/` and `/p/` href exists. Preventive pin (current corpus green). |
| S8-L2 | LOW | Paginated `/cat` canonicalizes page 2+ → page 1 (current guidance prefers self-referencing). | Read `searchParams` in generateMetadata; canonical includes `?page=N` when page > 1. RED e2e on `/cat/lowest-price?page=2`. |
| S8-L3 | LOW | Unused devDependency `@vitejs/plugin-react`. | `npm rm` + full gate (install/build is the test). |
| S8-L4 | LOW | a11y/e2e never scans dynamic states or mobile viewport (folds into S8-M1's state-scans). | The new state-scan spec covers drawer-open, cart-with-items, suggestions-open, favourited. |
| S8-L5 | LOW | `rule.collection` applies to every prefix match — `/new/new-products` shows a Christmas rail (live-probed). | `collection` only when `path === rule.prefix`. RED unit: `resolveInfoPage(["new","new-products"]).collection === undefined`. |
| S8-L6 | LOW | Rate-limit bleed between rapid gate re-runs on the reused :3100 server. | Doc note (AGENTS already covers stale servers; add one line to DEPLOYMENT §6 gate section). |
| S8-I1 | INFO | CSP `img-src … data:` allowance is unused (no data: images exist). | Drop `data:` from the directive (comment fix alone would also do; dropping is stricter and the e2e pin updates with it). |
| SearchAction | trivial | WebSite JSON-LD advertises a SearchAction whose target robots.txt disallows. | Drop `potentialAction` from `buildWebsiteJsonLd` (parity with robots); update the seo-ld unit pin. |

## Deferred again (documented)
Migration journal (first real schema change) · Redis limiter (single-instance ADR) · HSTS (TLS edge) · setCartQuantity LWW (accept) · CSP nonces (RSC bootstrap; style attrs can't be nonced anyway) · vitest `isolate:false` nicety.

## Execution order (TDD)
1. **S8-M4** extend docs-counts RED → **S8-M3** doc sweep GREEN (last manual sweep of this class).
2. **S8-M1** state-scan spec RED → favourite label fix GREEN (also covers S8-L4).
3. **S8-M2** resolveInfoPage unit RED (description/canonicalPath fields) → catch-all metadata GREEN → e2e pin.
4. **S8-L5** RED unit → exact-prefix collection scoping GREEN.
5. **S8-L1** census existence-check (verify RED path with a deliberately-absent slug in dev, then GREEN) · **S8-L2** paginated self-canonical + e2e · **S8-I1** CSP data: drop + pin update · **SearchAction** parity + unit pin update.
6. **S8-L3** `npm rm @vitejs/plugin-react` · **S8-L6** DEPLOYMENT note.
7. Screenshots refresh, PAD v2.7.0 revision block, SKILL v1.7.0 (§16 lessons + state line), AGENTS/CLAUDE/README counts, worklog Task 126, docs/session_8.md record (prepended like session_7.md), plan-008, DEPLOYMENT revision line + notes.
8. Full gate (counts change: +4~6 unit tests, +5~8 e2e state/canonical pins) → e2e ×3 → commit + SSH push via wrapper.

## Evidence to capture
- S8-M4 RED (SKILL 276 / DEPLOYMENT 23-categories failures) → GREEN.
- S8-M1 RED (label-content-name-mismatch on favourited state) → GREEN; state-scans green ×3 runs.
- S8-M2 live re-probe: garbage-under-prefix still 200 (it's a valid info path) but now unique description + canonical → prefix root; exact prefixes self-canonical; `/totally-unknown-page-xyz` still 404.
- S8-L5 live: `/new/new-products` renders without the Christmas rail.
- Full gate exit codes; sitemap stays 275; DB untouched (no reseed needed — no seed changes this session).

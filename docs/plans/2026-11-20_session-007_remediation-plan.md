# Nordhem Furnishing Store — Remediation Plan
**Date:** 2026-11-20 · **Session:** 007 · **Baseline commit:** `5c86ef8` (main)

**Inputs:** docs/session_7.md (session-006 record), plan-006, worklog Task 124, fresh audit (web-application + tdd skill methodology; read-only subagent + live curl/psql/agent-browser probes; skills/ excluded), homenest-store-s stack patterns (unchanged lineage).

## Baseline (verified this session, all exit-code-checked)
lint 0/0 ✓ · typecheck ✓ · typecheck:tests ✓ · unit 76/76 (11 files) ✓ · build cold ✓ · smoke 21/21 ✓ · e2e 25/25 ✓ · sitemap 276 ✓. All five session-006 fixes re-verified holding (code + pins + live probes: rotating `x-real-ip` 429s at request 10; unknown paths real 404s; `FOR UPDATE OF cart_items`; scanner guard covers docker-compose.yml; compose loopback). PostgreSQL 17 survived the recycle intact (242/23, 7 tables). The operator's `5c86ef8` is doc-only (adds session_7.md, deletes the consumed sample_DEPLOYMENT.md).

## Audit summary
0 CRITICAL · 0 HIGH · **4 MEDIUM · 8 LOW · 10 INFO**. Deferred-item verdicts: **CSP + axe-core = do-now**; migration journal + shared-store limiter = do-later; HSTS/token cleanup/SearchAction/setCartQuantity-LWW = never/accept. Test configs sound — no config change warranted (coverage config rejected: seam-coverage philosophy).

## Findings to fix (this session)

| ID | Sev | Finding | Fix |
|---|---|---|---|
| M-1 | MED | `hasForeignOrigin` trusts `x-forwarded-host` unconditionally — a curl attacker pairs `Origin: evil` + `x-forwarded-host: evil` and passes the 403 CSRF gate (live-verified). Browsers can't set that header (forbidden name) so real-world risk ≈ nil, but it contradicts the opt-in proxy-trust doctrine pinned in sessions 005/006. | Gate `x-forwarded-host` preference on `trustedProxyDepth() >= 1`; fall back to `host`. RED pins (unset env → foreign; depth 1 → honored); update the existing "honoring x-forwarded-host" test to set the env; live re-probe (pairing must 403). |
| M-2 | MED | **17 footer/home-linked content routes 404** — session-006's M-3 (correctly) killed soft-200s, but the RULES prefixes cover only 9 of the footer's long tail: `/planners`, `/customer-service/faq`, `/customer-service/mobile-apps`, `/customer-service/create-a-better-ikea-experience-together-pub54fa5690`, `/customer-service/returns-claims/guarantee`, `/customer-service/returns-claims/spareparts`, `/customer-service/product-support/recalls`, `/customer-service/product-support/secure-it-or-return-it-pub6b7f8175`, `/ikea-business`, `/this-is-ikea/*` (4), `/newsroom` + `/newsroom/media-resources` + disclaimers, `/campaigns/stay-cool-in-the-heat-pub521d0d30`. Live-confirmed. | Extend RULES with broad prefixes (`customer-service`, `this-is-ikea`, `newsroom`, `planners`, `ikea-business`; widen `campaigns/christmas` → `campaigns`). RED link-census unit test: every internal href in footerColumns + home.json card sections must be a known info path / app route / external. Live census re-run: 0 dead links, `/totally-unknown-page-xyz` still 404. |
| M-3 | MED | Doc-count drift in README (73/23, 10 files), CLAUDE (23 e2e), PAD (73/10, 23/3, **"6 tables"** ×2) — session-006 updated AGENTS+SKILL only. Truth: 76 unit / 11 files / 25 e2e / **7 tables**. | Sweep + NEW `tests/unit/docs-counts.test.ts` (RED first, fails on the 4 stale sites) pinning the live-tense count claims in README/AGENTS/CLAUDE/PAD against constants — makes this the last manual sweep. |
| M-4 | MED | `recycled-materials-700324` collection seeds **0 products** (no corpus text matches `/recycl/i`) — an empty, linked (home Guides card), sitemapped category page. `lowest-price` rule is healthy (125 tagged, 0 violations). | Option (b): drop the synthetic collection from the seed + category list, retarget the 2 links to `/product-guides/sustainable-products`. RED unit test: every collection referenced by pages.ts RULES + home.json `/cat/` links must map to ≥1 product under the seed's tagging rules (export a pure `tagCollections` helper from seed.ts). Requires reseed during verification (TRUNCATE + ensureCatalog). |
| CSP | MED (deferred, now due) | No Content-Security-Policy. Surface mapped: no inline handlers; inline = 2 JSON-LD + 2 RSC bootstrap + 15 style attrs; all JS self; images ikea.com. | Add `Content-Security-Policy: default-src 'self'; img-src 'self' https://www.ikea.com data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'` to next.config.ts headers. RED: extend the security-headers e2e to require the CSP header. Update README known-limitations + PAD (both say "No CSP yet"). |
| A11Y | MED (deferred, now due) | No machine a11y gate. Known issue L-2: h1 → h3 skips on /cat, /search, /favourites (product cards after h1 without h2). | Add `@axe-core/playwright` devDep + one spec sweeping 6-7 pages for critical/serious violations. Fix L-2 first (add `<h2 className="sr-only">Products</h2>` before the listing `<ul>` in listing-view.tsx + favourites page) so the sweep starts green. |
| L-1 | LOW | 23 category pages share the layout-default meta description. | `description` in cat/[slug] generateMetadata; e2e pin (category meta description ≠ layout default). |
| L-3 | LOW | `/api/health` is the only API route without `Cache-Control: no-store` (raw Response.json bypasses the helper). | Use the `json()` helper; smoke.sh header assertion (RED first). |
| L-4 | LOW | No `og:image` / `twitter:card` anywhere. | Product pages: `og:image` = `imageUrl(product.image, "l")`, `twitter:card: summary_large_image`; layout: `summary` default. e2e pin on product page. |
| L-6 | LOW | 404 page renders the default site title; the catch-all's "Page not found" metadata never surfaces on notFound(). | `metadata = { title: "Page not found" }` in not-found.tsx; extend the 404 e2e to assert the title. |
| L-5 | LOW | PAD:179 understates the cookie-secure rule (misses the NODE_ENV=production arm). | Fix in the M-3 sweep. |
| L-8 | LOW | Unused icons `check`/`pin` ship in the bundle (~100 bytes; dynamic indexing defeats tree-shaking). | Delete both entries. |
| I-10 | INFO | docker-compose.yml header still says "(home-furnishing-store)". | Rename to nordhem. |
| L-7 | INFO | Direct-exposure "unknown" bucket = global per-route ceiling (10/min checkout shared by ALL users). | One-line DEPLOYMENT §8 note (config guidance: proxy + TRUSTED_PROXY_DEPTH=1), no code change. |

## Deferred again (documented)
Migration journal (first real schema change) · shared-store limiter (multi-instance deploy) · HSTS (TLS edge) · SearchAction/robots parity (deliberate IKEA parity) · setCartQuantity LWW (accept) · unused color tokens (measured palette, keep).

## Execution order (TDD)
1. **M-1** RED pins → GREEN `http.ts` → live pairing re-probe (must 403).
2. **M-2** RED link-census test → GREEN RULES extension → live census (0 dead links, garbage still 404).
3. **M-3+L-5** docs-counts.test.ts RED → doc sweep GREEN (76/25/21/276/7 tables everywhere).
4. **CSP** e2e RED → next.config.ts GREEN (verify JSON-LD/RSC scripts still execute: pages render + JSON-LD present).
5. **A11Y+L-2** heading fix → axe spec (starts green; sweeps /, /p, /cat, /cart, /checkout, /search, 404).
6. **M-4** seed unit test RED (export tagCollections; collection-references-map-to-products) → drop the collection + retarget links → reseed → GREEN + live `/cat/recycled-materials-700324` → 404, home Guides card → sustainable-products guide.
7. **L-1/L-3/L-4/L-6** one-liners with their pins (e2e meta/og assertions, smoke cache-control assertion, 404 title).
8. **L-8+I-10** icon deletion + compose header rename.
9. Screenshots refresh, PAD v2.6.0 revision block, SKILL v1.6.0 (§15 lessons + state line), AGENTS/CLAUDE/README counts (new: unit 78+ files 12+, e2e 27+ with axe spec), DEPLOYMENT §8 L-7 note, worklog Task 125, docs/session_7.md record, plan-007.
10. Full gate with exit-code-checked verdicts (reseeded DB: categories 22 after M-4 → **sitemap 275**; all doc counts updated to match) → e2e ×3 → commit + SSH push via wrapper with `--remote` override.

## Evidence to capture
- M-1 RED→GREEN + live `Origin`+`x-forwarded-host` pairing → 403.
- M-2 census RED (17 dead) → GREEN (0 dead; garbage 404 holds).
- M-3 docs-counts RED (4 stale sites) → GREEN.
- CSP RED→GREEN + live header + JSON-LD still present.
- axe spec green ×3 runs (flake check).
- M-4 reseed verification (22 categories / 242 products / sitemap 275) + unit GREEN.
- Full gate exit codes; e2e ×3; screenshots 12/12 PIL-valid.

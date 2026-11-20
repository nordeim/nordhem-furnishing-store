The operator added two doc-only commits since session-001: `docs/session_1.md` (the session-001 transcript) and a worklog truncation keeping only Task 112 + Task 119. Root docs are unchanged from my push. Now let me restore the runtime environment — the `pg/` data dir and my SSH shim survived the workspace reset, so I only need to start PostgreSQL and reinstall deps:
PostgreSQL is back up with the full catalog intact (242 products / 23 categories — the data dir survived the sandbox recycle; three empty subdirs needed recreating). npm deps and paramiko are reinstalled too. Now the doc review and alignment validation:
The audit confirmed my flake diagnosis and found two more HIGH issues: the sitemap silently omits 218/242 products (behind a false comment), and `clientKey` trusts the client-spoofable first `X-Forwarded-For` hop. Writing the session-002 plan now, then executing:
Now writing the RED tests first (TDD):
RED confirmed for all 7 new http tests (the jsonLdScript tests pass already — the helper is correct; the test gap was the product page not using it, fixed below). Now the GREEN implementation:
Both failures are test-construction issues: my `request()` helper spreads custom headers over the URL-derived host (Node's `Request` doesn't set a `host` header from the URL), and single-hop XFF with depth 1 legitimately resolves. Fixing the tests to construct proper Requests:
H2 and M1/M4 done (18/18 green). Now the remaining lib fixes — sitemap all-products (H1), session secure (M5), summary retry (L5), search stale results (L10), pool error handler (L4), order_items index (L2), and JSON-LD helper dedup (L7):
All lib fixes in: typecheck ✓, lint ✓, **65/65 unit** (up from 52). Now the e2e spec fixes (H3 + M2) and the gitignore sweep (L3):
The counts reconcile: 21 `category` kind + 2 `collection` kind (collections are reachable via `/cat/[slug]` too — e.g. `lowest-price`, linked from the Offers page). Let me include collections in the sitemap since they're indexable listing pages, then run the flake check:
**267 locs = 2 static + 23 categories + 242 products** — the sitemap now covers 100% of the catalog. Running the e2e flake check (3 consecutive full runs):
The navigation DID work — the URL is correct; my regex `^\/p\//` fails against the full absolute URL. Fixing the pattern:
**18/18 e2e, three consecutive clean runs** — the flake is gone. Now the browser verification pass (mobile nav interactive check) and screenshot refresh:
All 7 gate steps green. Committing and pushing:
Session-002 complete — pushed to `main` as commit `fba521e`, remote ref verified by the SSH wrapper.

## What was done

**Workspace & alignment validation**
- Fresh clone at `006e30a` (the operator's two doc-only commits: `docs/session_1.md` transcript + worklog trim). Read all five root docs, session-001 plan, `docs/session_1.md`, and worklog — validated every claim against the codebase. All true **except one**: the sitemap coverage claim (below).
- Rootless PostgreSQL restored — the data dir survived the sandbox recycle but three runtime subdirs (`pg_tblspc`, `pg_logical/{snapshots,mappings}`) had vanished; recreated them, catalog intact (242 products / 23 categories).

**Audit** (read-only subagent, web-application + code-review + clean-code skills; `skills/`, `docs/` excluded): 0 CRITICAL · 3 HIGH · 5 MEDIUM · 10 LOW. Core commerce (checkout transaction, money math, validation, ILIKE escaping, PII hygiene, guard coverage, zero `classList`) confirmed clean.

**Remediation (TDD, plan at `docs/plans/2026-11-20_session-002_remediation-plan.md`)**
- **H1 — Sitemap omitted 90% of the catalog**: it listed only page 1 (24/242 products) behind a comment falsely claiming "every product fits the first page". Now `listAllProductSlugs()` + `listAllCategorySlugs()` emit every URL — **267 locs live-verified** (2 static + 23 categories/collections + 242 products).
- **H2 — Rate-limit bypass**: `clientKey` trusted the first, client-spoofable `x-forwarded-for` hop (defeating every limiter, including the order-probing brake on `/api/orders/track`). Now counts `TRUSTED_PROXY_DEPTH` hops from the **end** (default 1), failing closed; documented in `.env.example`; 4 unit pins.
- **H3/M2 — E2e flake**: the product-page specs clicked an aria-hidden image link and read the DOM before client navigation completed (~40% flake measured; the storefront twin could silently false-pass against the home page's sr-only `h1`). Both now click a visible link, wait for the URL, and assert product-page-specific content.
- **M1/M4/M5**: `readJson` Content-Type gate (415) + 16 KB body cap (413); session cookie `secure` in production unconditionally; 13 new unit tests covering `http.ts` (CSRF guard, IP key, body gates) and `jsonLdScript` escaping.
- **7 LOWs**: `order_items` index, playwright artifacts untracked, pg pool error handler, summary-badge retry, JSON-LD helper dedup, breadcrumb fix, stale search suggestions cleared.

**Verification**
- Full gate: lint ✓ · typecheck ✓ · typecheck:tests ✓ · **65/65 unit** (was 52) · build ✓ · smoke 19/19 ✓ · **e2e 18/18 across three consecutive runs** (flake eliminated).
- Browser: mobile drawer captured open + Products submenu (12/12 screenshots PIL-validated, refreshed in `docs/screenshots/`); the conditional-mount drawer state machine (open/close/reopen/Escape/scroll-lock) is pinned by the 6 mobile-navigation e2e tests — no Tailwind v4 display-utility bug, zero `classList` in `src/`.
- Docs lockstep: README/AGENTS/CLAUDE counts, PAD v2.1.0 (false known-issue row removed, deferred items recorded), SKILL v1.1.0 (session-002 lessons), worklog Task 120.

**Deferred (documented in the plan + PAD)**: dialog focus-trap (M3), first-request session race (L1), unused icons/tokens (L6), legacy `!p-0` prefix form (L8 — verified still compiling), CSP header, migration journal.

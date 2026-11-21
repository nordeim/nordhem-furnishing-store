---
name: nordhem-furnishing-store
description: Complete engineering skill for the Nordhem Furnishing Store codebase (IKEA Singapore re-creation) — Next.js 16 App Router, React 19, TS strict, Tailwind v4 CSS-first, Drizzle/PostgreSQL, Zod, Vitest/Playwright. Use when extending, debugging, auditing or replicating this storefront.
version: 1.17.0
last_updated: 2026-11-21
---

# Nordhem Furnishing Store — Engineering Skill (v1.17.0)

## §1 Project Identity & Design Philosophy
Independent educational re-creation of ikea.com/sg with working commerce (242-product catalog, search, cart, favourites, checkout, tracking, Family sign-up). One Next.js app + PostgreSQL; server-authoritative; degrade-never-fail; pure seams tested; superset of the marketing reference. **Project state (session 018): 117 unit tests / 55 e2e / 26 smoke checks; sitemap 274 locs (canonical roots only); CHECK-constraint SQL is DDL-legal (sql.raw constants — fresh-clone `db:setup` verified on an empty DB); the docs-counts census derives its constants from the tree itself (specs, files, smoke checks, categories, products, tables, sitemap, page/API routes, rate-limit literals) and pins every count shape it knows — prose, tables, tree comments, badges, the rate-limit table; the tailwind root census treats gitignored local files as scanner-benign (the oxide scanner's own .gitignore behavior); dev server hydrates via 127.0.0.1 (allowedDevOrigins + dev-only CSP unsafe-eval); HSTS live; paginated canonicals derive from the rendered page; synthesized deep pages carry unique descriptions and fold into prefix-root canonicals; paginated /cat pages self-canonicalize; collection rails render only on exact rule prefixes; axe-core serious/critical gate on 8 static surfaces + 4 dynamic states; link census verifies /cat/ and /p/ existence; CSP without the unused data: allowance; no SearchAction (robots parity); checkout locks only the session's cart rows (FOR UPDATE OF cartItems); unknown content paths 404; production build clean.**

## §2 Tech Stack (locked)
Next.js ^16.4.2 · React ^19.2.6 · TypeScript ^5.9.3 strict · Tailwind ^4.1.17 (CSS-first) · Drizzle ^0.45.2 · PostgreSQL 17 · Zod ^4.6.7 · Vitest ^5.1.0 · @playwright/test ^1.65.1 · @fontsource/noto-sans ^5.3.0. Node ≥ 20, npm ≥ 10, one lockfile.

## §3 Bootstrapping
```bash
npm install && bash docs/setup_pg_z.sh && cp .env.example .env && npm run db:setup && npm run dev
# gate: npm run lint && npm run typecheck && npm run typecheck:tests && npm test && npm run build \
#       && BASE_URL=http://127.0.0.1:3100 scripts/smoke.sh && npm run test:e2e
```
Env: `DATABASE_URL` (required — shell env beats .env, dotenv never overrides), `NEXT_PUBLIC_SITE_URL` (build-time inlined). Seed CLI = `scripts/seed-cli.ts` (dotenv BEFORE the import graph; src/db throws at import time without the URL).

## §4 Design System (CSS-first)
Tokens in `src/app/globals.css` `@theme inline` with literal hex (ink #111, brand #0058a3, yellow #ffdb00, surface #f5f5f5, line #dfdfdf …). Utilities `@utility btn/btn-*/field/page-x/scrollbar-none`. Container 1760px; breakpoint xs 30rem. No tailwind.config.js — ever.

## §5 Component Architecture
Layers: content → lib (pure seams) → db → components → app. Client islands: header/drawer, search-box, carousels, cart view, forms, toaster, shopping-store (`useSyncExternalStore` module store — no Zustand). Route handlers thin: guard() wraps Zod → rate-limit → origin-check → Drizzle → envelope.

## §6 Anti-Patterns & Common Bugs
1. **Tailwind scanner leak (the signature bug, hit TWICE)**: prose in root markdown compiles class-shaped tokens into invalid CSS → `CssSyntaxError: Missed semicolon` at ~100KB offsets → build dies. Fix = `@source not` guard in globals.css; **paths are relative to the CSS file** — root targets need `../../`; bare `docs`/`skills`/`**/*.md` match NOTHING in 4.1.17. Warm Turbopack cache masks it: `rm -rf .next`. Pinned by tests/unit/tailwind-scan-guard.test.ts. NEVER write literal arbitrary-value classes in root docs or comments.
2. JS-toggling `hidden` vs `flex` (v4 bug class) — conditionally mount panels instead (zero classList in src/).
3. Client-supplied prices — the server re-derives inside the checkout transaction.
4. Shell DATABASE_URL shadowing .env — check `env | grep DATABASE` before touching code.
5. tsx compiles .ts as CJS here — no top-level await in scripts.
6. Stale :3100 server → phantom e2e failures on untouched pages; restart first.
7. aria-hidden product image links — use `a[href^='/p/']:visible` in e2e.
8. `**/*.md` inside a JS block comment terminates the comment (`*/`) — parse error far from the cause.

## §7 Debugging Guide
| Symptom | Root cause | Fix |
|---|---|---|
| Build: Missed semicolon at huge CSS offset | prose token in scanner | restore `../../` guard; rm -rf .next |
| DATABASE_URL is required at import | seed ran without .env | scripts/seed-cli.ts (dotenv first) |
| Wrong DB / missing data | shell env shadow | `env -u DATABASE_URL` |
| e2e fails, code unchanged | stale :3100 | restart server |
| 429s in tests | fixed-window limiter | one login per suite; wait Retry-After |

## §8 Pre-Ship Checklist
Gate chain green (all seven steps) · changed surfaces at 390/768/1440 · `git status` free of .env/keys/logs/test-results · doc counts swept (README/AGENTS/CLAUDE/PAD same-commit) · scanner guard test still green after adding any root file · conventional commit to main · push via docs/ssh_git_wrapper_v3.py.

## §9 Lessons (session 001)
1. The `@source not` relative-path semantics is the entire guard — verify with a probe, not docs.
2. The oxide scanner reads markdown by default; the JS-side file hook sees nothing — bisect by hiding files.
3. Test files that pin poison tokens must construct them by concatenation, or they become the leak.
4. An existing good README can be updated in place — full rewrites lose accurate specifics.
5. Production-build e2e caught nothing the smoke missed, but the mobile-navigation pin is the regression net for the v4 drawer bug — keep it first-class.

## §10 Lessons (session 002)
1. A code comment that says "every product fits the first page" is a claim, not a fact — PAGE_SIZE=24 vs 242 products; the sitemap omitted 90% of the catalog behind that sentence. Verify data-dependent claims against the data.
2. `x-forwarded-for.split(",")[0]` is the single most common rate-limit bypass: proxies APPEND, so the FIRST hop is client-controlled. Count from the END per a declared proxy depth, and fail closed.
3. Playwright `:visible` does NOT exclude `aria-hidden` links; `.click()` resolves at dispatch, not navigation. Click a named/visible target and assert the URL before reading the DOM — otherwise the test races (or silently passes against the previous page).
4. `toHaveURL(/^\/p\//)` fails on absolute URLs — Playwright matches the full URL; drop the anchor or match the host too.
5. Node's `Request` does NOT populate a `host` header from the URL — set it explicitly in unit tests that exercise host-dependent logic (the CSRF guard).

## §11 Lessons (session 003)
1. A doc/impl mismatch is its own vulnerability class: .env.example promised `TRUSTED_PROXY_DEPTH=0` = "ignore XFF" while `Math.max(1, …)` made 0 unreachable — live curl proved forged single-hop XFF still minted fresh rate-limit buckets on direct exposure. Docs that promise security behavior must be pinned by a test of that exact behavior.
2. Removing a synchronous guard flag without adding an in-flight promise turns every mount effect into its own fetch: 25 FavouriteButtons = 25 parallel /api/summary requests. Retry-on-failure and request-collapsing are two separate requirements; the guard must cover both.
3. `expect.poll` + `page.evaluate(activeElement …)` beats counting Tabs when pinning a focus trap — the wrap point is "focus never leaves the drawer", and the exact focusable count is an implementation detail (the Products submenu changes it).
4. e2e `reuseExistingServer` silently tests a STALE build after source edits — kill the server (or rebuild) before trusting a post-fix green run; a focus-trap "pass" against the old bundle is meaningless.
5. A DEPLOYMENT.md from a previous product lifetime (SQLite/Prisma/Stripe/admin references) is worse than no doc: every operator instruction in it is false. When a repo is rewritten, deployment docs belong in the rewrite's definition of done.







## §25 Lessons (session 018)
1. A count guard's weakest link is upstream of the guard: comparing docs to hand-set constants verifies nothing about the constants. Derive what is derivable (readdir, source grep, the seed's own content arithmetic) and the guard's inputs become unfalsifiable — only the two run-derived totals stay hand-set.
2. Two ignore policies that drift apart become each other's false alarm: `.gitignore` blessed `.env*`/`*.log` while the scanner census condemned them by exact name. The oxide scanner respects .gitignore — derive the census's ignore decision from `git check-ignore` and the two policies can never diverge again.
3. Dead weight ships forever unless something pins structure: a byte-identical duplicated §16 survived nine sessions of count sweeps because every check read content, never shape. A heading-uniqueness pin costs six lines and closes the class.
4. An absolute claim in a state line ("every shape is pinned") is itself a finding waiting to happen — the session after you write it will enumerate your exceptions. Word state lines to what is verifiably true today and name the mechanism, not the totality.
5. A wrap-aware regex is a wrap-aware test: prose reflows (markdown doesn't preserve your line breaks), so census shapes that span a bold phrase must ride `**N\s+categories**` with `\s+`, and a table claim split across lines needs the wrap in the pattern — otherwise the pin silently covers only the unwrapped variant.

## §24 Lessons (session 017)
1. A drizzle `sql` template binds every interpolated JS primitive as `$N` — legal in DML, ILLEGAL in the DDL that `drizzle-kit push` emits for CHECK constraints/defaults. Constants that must reach DDL use `sql.raw(String(…))`. The bug shipped invisibly because warm-DB pushes SKIP same-name altered checks — only a fresh empty database exercises the CREATE path.
2. "Generated SQL verified unchanged" must mean the emitted TEXT, not the bound value: S15-L3 verified `params:[99]` and called it `between 1 and 99`. Serialize through the same dialect the tool uses (`PgDialect.sqlToQuery`) and pin the TEXT in a unit test — a DDL-legality invariant belongs in the suite, not in a one-off manual check.
3. A warm database is a mask, not a verification: every tier ran green for two sessions against a PG data dir that predated the regression. Any claim that "bootstrap works" needs an empty-DB run — the fresh-clone path is its own gate, distinct from the warm-path gate.
4. The count-shape sweep is finished only when the BADGES are counted too: README's shields.io labels (`Vitest-113_passing`) were count claims no regex could see, and the e2e table row sat stale at 53 through a "counts swept" commit. Enumerate count sites from the DOC's perspective (every place a number appears), not the test's.
5. Dead test scaffolding implies coverage that does not exist: the per-doc regex arrays in docs-counts were never executed, and two of them were exactly the shapes that had drifted. When a guard's data structure says one thing and its consumer does another, the guard lies — delete or wire it.

## §23 Lessons (session 015)
1. "Exit-code-checked" is a claim about a PAST run, not a property of the tree: lint had been red since session-012's own commit while three consecutive session records claimed "lint 0/0 · exit-code-checked" — the pinned toolchain never changed, the runs evidently were never exit-checked. Re-run the gate yourself before writing "verified"; the worklog's history is evidence, not proof.
2. A setState-in-effect bug is fixed by deleting the effect, not hiding the call: folding the reset into the close() funnel (every leave path routes through it) is lint-clean AND simpler than the panel-watching effect it replaced — and the existing S12-I4 e2e still pins the semantics through the refactor.
3. "Zero coverage in any tier" is a tier-independent audit dimension: the cart stepper (PATCH), Remove (DELETE) and un-favourite (DELETE) shipped for 14 sessions with no pin anywhere — grep all three tiers per surface, not per file.
4. A fixed-list guard test gives false confidence: it proves the KNOWN fences exist, says nothing about the NEXT file. Enumerate the actual root in the test and the arrival of an unfenced root file becomes a RED test instead of a broken build.

## §22 Lessons (session 014)
1. A JS breakpoint listener must use the same UNIT as the CSS breakpoint: Tailwind v4's `lg` is `64rem`, and media-query rem follows the user's default font size — `matchMedia("(min-width: 1024px)")` silently diverges from `lg:hidden` under any non-default root font.
2. Role locators cannot see `display:none`. To pin "unmounted" in an e2e, count the DOM node with a CSS locator — a role-locator count of 0 passes for both unmounted and merely hidden.
3. A focus-restore target must be VISIBLE at the moment of restore. Closing a mobile drawer by crossing to desktop strands focus on `<body>` if you restore to the (now hidden) trigger — restore to an element that exists in both layouts.
4. A "lenient" schema should be total: if the contract is "bad values fall back to defaults", add `.catch` so non-string inputs cannot throw when the schema is reused outside its original searchParams path.
5. Section pointers inside operator scripts (`see docs/DEPLOYMENT.md §6`) are documentation too — they drift silently when sections are renumbered, and the docs-counts census cannot see them. Grep them when restructuring a doc.

## §21 Lessons (session 013)
1. Validate the OUTPUT of a transform, not just its input: "finite dollars" said nothing about "roundable to a sane integer of cents". Infinity and int8-overflow live one multiplication away from every unit-converting Zod transform.
2. A count-census is only as good as its coverage list. DEPLOYMENT.md drifted five sessions while four other docs tracked — when you build a lockstep mechanism, enumerate EVERY doc that states the claim, and add new claim-stating docs to it the day they appear.
3. `lg:hidden` hides; it does not unmount. Any state tied to a conditional *visibility* class (scroll locks, focus traps, listeners) must also watch the breakpoint itself — matchMedia is the close companion of every responsive-hide utility class.
4. A recycler that prunes empty directories can kill a PostgreSQL cluster without touching a single row: the eleven standard empty subdirs (pg_notify, pg_stat, pg_logical/snapshots, …) ARE part of the format. Recreating them with mode 700 recovered the cluster with zero data loss — worth knowing before reaching for a reseed.
5. When a doc says "X does not apply here", put a date on it: the sample-facts list said HSTS did not apply, which was true for five sessions and then silently became false.

## §20 Lessons (session 012)
1. "Probe" is a load-bearing word in a rate-limit table: a select-1 health check and a cookie-keyed two-query read are both GETs, but only one deserves "unlimited". Audit doc tables for posture words, not just numbers.
2. A source-text tripwire is only as good as its slice boundary. Regexes that stop at "the first \n}" are betting on formatting; indexOf-to-next-declaration bounds the pin structurally — the assertion then bites under any refactor.
3. State that survives a conditional mount is invisible to the unmount: the drawer unmounted cleanly, the aria attrs stayed truthful, and the bug only appeared on the SECOND open. Always test the reopen, not just the open and the close.
4. og:image must never be an empty string — scrapers treat "" as a broken preview. When the underlying column is nullable (1/22 categories), make the key conditional, not the value.
5. When you verify a limiter live, remember the window budget is shared across everything that ran before you from the same key (the e2e suite's own calls). 78+42=120 was the correct answer, not a flake.

## §19 Lessons (session 011)
1. When you fix a "this export silently replaces the parent's" bug on ONE page, grep for every OTHER page exporting the same partial shape the same day — the og:replace class existed on `/` AND `/p/*` AND (unexploited) `/cat/*`; one audit pass found the siblings immediately.
2. A RED test proves the pin bites only if the fixture exercises the exact code path. Session-011's first fresh-window pin failed pre- AND post-fix — staggered clocks were needed so eviction (not prune) removes the victim; without the stagger, prune quietly ate the flood and the pin proved nothing either way.
3. Re-reorder insight chain: insertion-order queues punish keys that return after absence, not just keys that never left. Any LRU-ish eviction over a Map needs delete+reinsert on EVERY path that refreshes a key's liveness (renewal AND fresh-window).
4. A doc table can describe the intended posture more accurately than the code — when they drift, ask which one is right before "code-wins". Here the doc was right: the unauthenticated DB-touching read deserved the limiter all along.
5. Fixed-delay test scaffolding is a hydration-speed bet: budget for CI-slow machines (2x the observed time), and say so in a comment so the next person knows the delay is load-bearing, not arbitrary.

## §18 Lessons (session 010)
1. A page-level `openGraph` in Next's Metadata API REPLACES the layout's — only title/description/images are backfilled. Shipping a partial og block (`{ url }`) silently drops every other field. Repeat the full set at the page level, and pin og:type/og:site_name in e2e — the S9 pin asserted only og:url, so the regression shipped invisibly.
2. A negative-only test ("no X exists") passes when nothing happens at all — the S9 SmartImage pin could not distinguish "conditional fallback works" from "no fallback ever rendered". Positive pins need the behavior to actually FIRE.
3. To e2e-test an image-failure fallback you must defeat the pre-hydration gap: Chrome's lazy-load margin requests everything at load, so immediate aborts fire before React attaches onError. Delay the aborts past hydration (route handler sleep) and both fallback shapes become observable.
4. A renewal path that only mutates a Map value never refreshes insertion order — the key stays at the front of any oldest-first eviction queue forever. Delete+reinsert on renewal.
5. When choosing an eviction victim, exclude the caller's own key: otherwise a blocked client at capacity deletes its own bucket mid-check, misses its own lookup and mints itself a fresh window.
6. Renewal-before-the-flood doesn't reorder a key behind keys that do not exist yet — sequence test fixtures so the renewal happens while the competing keys are already tracked (the first version of the pin was vacuously wrong in the other direction).

## §17 Lessons (session 009)
1. "Works on the production build" is not "works": the e2e suite ran 44/44 green while `npm run dev` was completely inert — the gate never looks at the dev server. Browser-verify BOTH servers after any header/config change.
2. A dev-server hydration death had TWO stacked causes and the obvious one (CSP blocks eval) was only the noisy half: React logged 8 eval errors yet still hydrated. The real killer (Next 16 blocking 127.0.0.1 as a cross-origin dev origin) was silent. Verify the fix, not the theory — the experiment (strict CSP + localhost origin) isolated the actual cause.
3. A stale :3100 server strikes again: `pkill -f "next start"` matches NOTHING (the process is `next-server`) — "e2e fails on a page you did not change" after a rebuild means the OLD server still owns the port. Kill by PID from `ss -tlnp`.
4. Metadata that re-derives a value the body computes is a divergence waiting to happen: the canonical clamped `?page` its own way while the listing pipeline clamped another. Share ONE cached loader between generateMetadata and the page (primitive cache keys — both callers hold different searchParams objects).
5. An a11y pin that asserts an exact count (`toHaveCount(1)`) is a catalog-refresh time bomb; pin "at least one + first matches the query".
6. Images that fail BEFORE hydration fire onError before React attaches it — the SmartImage fallback never renders for them (observed live, documented); pin the DOM contract, not the failure path.

## §16 Lessons (session 008)
1. Scan STATES, not just pages: the favourite pressed-state violation survived seven sessions because every axe run analyzed freshly-loaded pages. Any interactive component with state-dependent labels/roles needs a scan per state (pressed, open, loaded-with-data).
2. A link wrapping a decorative image is itself nameless: alt="" is correct for the image, but the link still needs an aria-label — the two accessibility decisions interact.
3. Broad acceptance rules trade one failure class for another: killing dead links with broad prefixes (session-007) re-opened indexable thin content (session-008). Every routing acceptance rule needs a metadata-collapse story (unique description + canonical folding) in the same change.
4. A count guard must cover every doc that makes the claim: docs-counts.test.ts caught README/AGENTS/CLAUDE/PAD drift but not SKILL/DEPLOYMENT or sitemap/category counts — and exactly those drifted. Enumerate claim sites from the docs' perspective, not the test's.
5. Canonicals on paginated series should self-reference: canonical-to-page-1 tells crawlers the tail is duplicate; Google's guidance prefers self-canonical per page.
6. Crawlable metadata must match robots policy: advertising a SearchAction into a disallowed path is a mixed signal — drop the advertisement, don't open the path.

## §15 Lessons (session 007)
1. A correct fix can create link rot: killing soft-404s (session-006 M-3) was right, but nobody census'd the footer long tail — 17 rendered links started 404ing. After any routing-behavior change, crawl every internal link the site actually renders (the link-census unit test now does this permanently).
2. Trust doctrine must cover every proxy header, in every guard: session-006 closed x-forwarded-for/x-real-ip in clientKey but left x-forwarded-host in the CSRF check. Enumerate ALL client-authorable headers once per security review, not per finding.
3. An empty collection is a product defect even when the code is correct: the recycled-materials heuristic fired on zero corpus rows — shipping a linked, sitemapped empty shelf was the real bug. Empty-state pages must be reachable only by real states.
4. Machine-enforce doc counts: two consecutive sessions missed count sites in manual sweeps; `tests/unit/docs-counts.test.ts` turns drift into a RED test. Any cross-file invariant that humans keep failing belongs in the suite.
5. axe pays for itself on the first run: the sweep immediately caught a label/name mismatch no manual pass had noticed (aria-label carried the product name, visible text didn't). Gate on serious+critical to stay actionable.
6. Test configs can be complete: "add vitest/playwright" was a no-op because the suites exist and are correctly configured — the genuine gaps were content (axe sweep, metadata pins), not config. Say so instead of churning working config.

## §14 Lessons (session 006)
1. Closing HALF the trust hole reopens the whole: session-005 made x-forwarded-for opt-in but left x-real-ip as an unconditional fallback — live-probed, 12/12 rotating spoofed x-real-ip headers bypassed the same limiter the fix was protecting. When the fix is "distrust client headers", enumerate EVERY header in the trust path, not just the famous one.
2. A row lock is scoped or it is a contention bug: FOR UPDATE on a JOIN locks every table's rows — cross-session checkout contention on hot products and a multi-cart deadlock vector. Drizzle's `.for("update", { of: [table] })` scopes it; update the text-assertion pin in the SAME commit or the suite goes red for the wrong reason.
3. A catch-all route is an infinite-URL generator unless it 404s: serving a synthesized 200 page for ANY ≤6-segment path is an indexable soft-404 farm. The predicate (isKnownInfoPath) belongs beside the rules it tests, and the route must gate notFound() on it.
4. Every NEW root file is a scanner incident waiting to happen: docker-compose.yml arrived in a doc-only commit — unguarded, scanner-verified as the only root survivor, and the poison experiment proved .yml colon-form tokens ARE extracted. The @source guard and its test pin must grow in the same commit that adds a root file.
5. A sample document is a structure, not a source of facts: the operator's sample_DEPLOYMENT.md was written for a sibling repo — 33 of its claims were false here (tables, routes, env vars, payments, imagery, HSTS, test counts). Port the skeleton; re-derive every fact from the tree, then re-verify against the live server.
6. Compose short-port syntax binds 0.0.0.0: a postgres:postgres container published as "5432:5432" is network-reachable on any multi-interface host. Loopback-only is the repo contract — "127.0.0.1:5432:5432".

## §13 Lessons (session 005)
1. An "unset means the common case" default is wrong when the header is client-controlled: defaulting proxy depth to 1 made every direct-exposure deployment trust a single-hop spoofed `x-forwarded-for` — live-probed, 12/12 rotating XFFs bypassed the checkout limiter. Security-relevant trust must be OPTED INTO (unset = fail closed), and the .env.example prose that said "leave unset on direct exposure" was itself the vulnerability's document.
2. A text-read of a transaction is not a concurrency proof: `SELECT` then `INSERT` then `DELETE` inside one tx is a double-order race under READ COMMITTED without `FOR UPDATE` on the rows the transaction's outcome depends on. Lock the session's cart lines at the head of the checkout tx; the loser must see `empty_cart`.
3. Sitemap "coverage" has a second axis beyond products: the long-tail info routes (offers/rooms/stores/services/policies) are 200-status, indexable and linked from nav — 9 of 9 were invisible to crawlers. When auditing SEO, enumerate every 200 route against the sitemap, not just the catalog.
4. The lint warning backlog is a false economy: the one `react-hooks/exhaustive-deps` warning (ref read in cleanup) was a 2-line fix once triaged, and a clean `0 problems` lint output makes any NEW warning a signal instead of noise.
5. Keyboard operability of a combobox is not "Tab reaches the links eventually": the ARIA pattern requires ArrowDown/ArrowUp to move focus into the list. One `onKeyDown` branch + one e2e `toBeFocused` pin closes it.

## §12 Lessons (session 004)
1. Never verify a test gate by grepping the last line of the runner output: Playwright prints "N passed" after the failure block, so `grep passed | tail -1` showed 21 passed and hid "1 failed". Every verdict comes from the process exit code plus the full tally block.
2. A test born RED is a silent debt: the outside-click pin landed failing (it clicked a 1×1 sr-only h1 — pointer events intercepted by the sticky header) and the commit still claimed 22/22. After writing any new e2e test, run it ALONE and check its exit code before running the suite, and never write "N/N green" into a commit message you did not see with your own exit-code check.
3. A shared ref bound inside a `.map()` holds only the last-rendered element — per-item interactions need per-item identity (a `data-*` marker + `closest()`), not `ref !== target` comparisons. The bug: clicking a popover's own button closed it on pointerdown and re-opened it on click (stale-true toggle).
4. e2e locators must not be textual `filter({ hasText })` on broad attribute selectors — `[aria-label]` matched the carousel region and list ancestors. `data-testid` is boring and correct.
5. Orphan-row hygiene for cookie-only sessions belongs in an operator cron with a dry-run default (`scripts/prune-abandoned-carts.mjs`), never in the request path — and the prune predicate must match the REAL schema (cart_items has only `updated_at`; favourites only `created_at`): check information_schema before writing the SQL, then live-verify by backdating a probe row.

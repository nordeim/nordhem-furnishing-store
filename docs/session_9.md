# Session 009 — the dev-server hydration fix + canonical-render alignment cycle

**Baseline (fresh re-clone at aba07e4 after a workspace reset, all exit-code-checked):** lint 0/0 · typecheck ✓ · typecheck:tests ✓ · unit 90/90 · build cold ✓ · smoke 21/21 · e2e 44/44 · sitemap 275. PostgreSQL: fresh rootless install via docs/setup_pg_z.sh; 22 categories / 242 products seeded. All session-008 fixes re-verified holding live.

## What was done

**Audit (read-only subagent + live probes; web-application + tdd skill methodology):** 0 CRITICAL · 0 HIGH · 2 MEDIUM · 10 LOW · 7 INFO, plus verdicts on every deferred item (HSTS do-now; migration journal + CSP nonces do-later; Redis limiter / setCartQuantity LWW / vitest isolate:false never) and a deliberate no-op verdict on the standing "modify the vitest/playwright configs" instruction — both configs audited sound (session-007 §15.6 precedent).

**Browser verification (agent-browser):** production :3100 — the mobile drawer state machine fully passes (open, Products submenu, navigate→unmount, Escape, close+focus-restore+scroll-lock), combobox ArrowDown, full cart→checkout→order→track round-trip (wrong email → single generic error), desktop 1440×900 clean. **No Tailwind v4 display-utility bug.** THE session finding: **`npm run dev` was inert** — React never hydrated on :3000 (zero fiber keys; every client island dead). Isolated by experiment: (a) the CSP lacked `unsafe-eval` (React dev runtime — noisy, 8 console errors, not fatal); (b) the hydration killer — Next 16 blocks `127.0.0.1` as a cross-origin dev origin (`allowedDevOrigins`), silently 403ing dev resources.

**Remediation (TDD, plan-009, each RED→GREEN):** S9-H1 (dev-CSP seam + allowedDevOrigins + HSTS, live re-verified: drawer mounts via 127.0.0.1, 0 eval errors) · S9-M1+L3 (one cached loader per page; canonical from the page actually rendered; e2e-pinned) · S9-L1 (home canonical + og:url) · S9-M2 (bounded rate-limiter eviction + size() seam) · S9-L2 (sitemap canonical roots only, 275→274) · S9-L4 (button cursor base rule) · S9-L5 (hotspot 44px hit area) · S9-L6 (SmartImage decorative-fallback aria-hidden) · S9-L9 (count-independent a11y pin) · S9-L7 (scan-guard SKILL.md pin) · S9-L8 (.env.example MAX_AGE_DAYS) · S9-L10 (smoke.sh mode bit) · S9-I4 (error.tsx logging).

**Verification — all exit-code-checked:** lint 0/0 · typecheck ✓ · typecheck:tests ✓ · **unit 102/102 (16 files)** · build cold ✓ · smoke 21/21 · **e2e 49/49 ×3** · sitemap **274** · screenshots **12/12** PIL-valid, captured from the **dev server** (:3000) — the interactive shots double as live proof of the S9-H1 fix.

**Deferred (documented):** migration journal · CSP nonces · Redis limiter · setCartQuantity LWW · pre-hydration image-failure fallback (onError attaches after the error fires).

---

我将继续执行任务。首先检查工作区当前状态，然后刷新代码库。
I'll start by checking the workspace state — whether it survived, whether there's a new `docs/session_8.md` from the operator, and the PostgreSQL/server status:
The repo directory is empty — need to re-clone. The pg data dir survived (so I can restore the DB as in session 006). Cloning now:
Session 008 begins. The operator's `ef35f32` is doc-only (session_7.md's record). Now restoring PostgreSQL — the sandbox recycle likely pruned empty runtime subdirs again (session-006's restore procedure):
Same failure mode as session 006 — one more pruned dir (`pg_logical/mappings`). Creating it and restarting:
**PostgreSQL 17 restored** — 242 products / 22 categories / 7 tables intact (session-007's reseed state preserved). Now npm install and the baseline gate:
The `.env` file was wiped with the workspace reset (it's gitignored). Restoring it from `.env.example` and re-running:
The browser binaries were wiped from `~/.cache` too. Installing them:
**Baseline fully green** — lint 0/0 · typecheck ✓✓ · unit 84/84 · build cold ✓ · smoke 21/21 · e2e 38/38 · sitemap 275, and all session-007 fixes verified live (CSRF pairing 403, unknown 404, `/planners` 200). Docs alignment spot-check, then launching the audit subagent:
Found one stale line: SKILL.md §1 still says "sitemap 276 locs" (truth: 275 — the session-007 final docs script updated the unit/e2e counts in the state line but the sitemap number didn't take because the old string had already been partially replaced). That's a small D-1 finding for this session. Launching the audit subagent now:
很棒的审计。核心发现：收藏按钮的激活状态仍然违反了 Label-in-Name（axe 测试扫描从未检测到它），宽泛的 RULES 前缀重新开启了无限且可索引的薄内容（`/customer-service/<garbage>` → 带有默认元数据且无 canonical 的 200 页面），过时的 “No CSP yet” 文档声明 ×4 + 种子计数 ×2，以及 `docs-counts.test.ts` 中的一个作用域漏洞，导致此类偏差漏网。接下来进行浏览器验证：
**S8-M1 实时验证**：激活状态显示 aria-label 为 "Remove BILLY / OXBERG from shopping list"，但可见文本为 "Saved BILLY / OXBERG to shopping list" —— 这正是审计所标记的 Label-in-Name 违规问题。现在我来快速进行一次 cart→checkout→track 的往返流程，以及 thin-content 探测：
所有浏览器验证已完成 —— 移动端导航完整状态机通过，无 Tailwind v4 偏差，结账流程端到端正常工作，S8-M1/S8-M2 已实时确认（garbage-under-prefix 使用默认 meta 渲染 200，无 canonical）。正在撰写 session-008 计划：
Plan validated against the codebase (all anchors live-probed this session). Executing TDD — S8-M4 first, extending docs-counts with the new constants and doc coverage:
**RED 已确认**（确认为陈旧网站：SKILL 276/84-state，DEPLOYMENT 23-categories）。现在进行 S8-M3 文档清理以达到 GREEN 状态，并处理 "No CSP yet" ×4 的声明：
**S8-M3+M4 GREEN (7/7).** Now S8-M1 — the state-scan axe spec (RED) plus the favourite label fix:
存在两个测试框架问题：(1) `.first()` 匹配到了相关产品的按钮——必须使用 `getByRole` 并配合确切的 BILLY 名称；(2) 在此服务器上下文中，点击“添加到购物车”后购物车为空（网络会话 cookie）——需要等待购物车行项目。同时修复标签（GREEN 修复）：
收藏按钮的点击已触发，但 `aria-pressed` 未能翻转——`request()` 辅助函数可能静默失败了。让我直接探测一下 API，并检查 `request()` 是如何处理 cookies/CSRF 的：
API 工作正常。问题出在我的测试选择器上：`getByRole("button", { name: "Save BILLY / OXBERG to shopping list" })`——当 Playwright 通过 aria-label 解析名称时，`.and(page.locator(".btn-outline"))` 应该能起作用……但错误显示按钮一直保持 `disabled`（待处理状态卡住）。实际上，错误显示 `disabled` 且 `aria-pressed=false` ——点击可能触发了，但 store 的更新没有重新渲染。再仔细看看：测试点击了 `favourite`，但 3 次重试显示 `disabled` ——这意味着 `setPending(true)` 被触发，而 await 一直处于挂起状态。在会话 007 的手动浏览器探测中，在适当的等待之后，它是可以正常工作的。不同之处在于：这个 Playwright `page` 是一个全新的上下文 —— cookies 是没问题的……让我通过 Playwright 追踪（trace）检查一下点击时发生了什么：
`request()` 没有发送 `Origin` header——浏览器会自动执行此操作，所以没问题。等待——浏览器 fetch 确实会自动发送 Origin。真正的问题可能是我之前的 API 探测消耗了速率限制……不对，favourites 的限制是 5/分钟。我测试的 `.and(page.locator(".btn-outline"))` 组合：当有 `label` prop 时，按钮拥有 `btn-outline` 类——检查一下相关的商品按钮是否也有 `btn-outline`……没有，它们使用的是 `size-10 rounded-full`。嗯，但失败日志显示它解析到了正确的按钮（“Save BILLY / OXBERG”，btn-outline w-full）——被禁用了。所以点击触发了 `handleClick`，并且 `await toggleFavourite(...)` 没有返回。让我通过在追踪开启的情况下运行一次测试，来检查它是否是 CSRF 403 错误：
**POST 返回 201 并成功** — 点击生效了。一旦按钮变为激活状态，我的 locator 就会超时，因为 aria-label 变为了 "Remove BILLY / OXBERG from shopping list"，所以名称匹配器（name matcher）失效了。这其实是 *正确的* 行为。因此，之前的测试失败是因为 `expect(favourite).toHaveAttribute("aria-pressed", "true")` —— 等等，这也是同样的问题……不对：`toHaveAttribute` 会重新查询，但在点击后 locator 的名称过滤器 "Save…" 与现在的 "Remove…" 按钮不匹配。我需要在点击后使用不同的 locator。同时应用 GREEN 标签修复（将激活状态的可见文本与 aria-label 对齐），这将使整个问题迎刃而解：
现在我来修改测试，使其在点击后重新查询（通过 `.btn-outline` 进行定位，并断言激活状态下的可见文本 — 这同时也锁定了 GREEN 行为）：
Favourite 和 drawer 已通过。Cart 和 suggestions 仍然失败——很可能是 e2e 服务器上下文中存在 add-to-cart 停滞或 listbox 命名问题。正在排查：
流程运行正常（购物车中有 BILLY ×2，empty-heading 为 0）——所以我的测试失败在于断言的时序/定位器问题。而且搜索面板：`/api/search?q=billy` 返回 200，但 `getByRole("listbox")` 数量为 0 —— 建议容器可能没有 `role="listbox"`（可能是普通的 `<ul>`）。正在检查实际的 markup：
面板是通过 `id={listId}` 定位的 `<div>`，而不是 `role="listbox"`。此外，`showPanel` 需要 `open` 和 `results` 的组合。正在将这两个测试修正为实际的契约（面板 div + cart-line 等待）：
4个测试中有3个通过。购物车测试现在确实触发了 axe 违规 —— 让我看看是哪一项：
购物车页面上存在一个**真实的发现**：有一个没有可访问名称的链接（`link-name`，非常严重）。State-scan 的设计立即见效了。让我来找一下：
Found it — `cart-view.tsx:58`: the thumbnail link wraps an image with `alt=""`, so the link has no accessible name. The image is decorative inside the link, but the link itself needs a name. Fixing:
**S8-M1+L4 GREEN — 所有 4 个状态扫描均通过**（并捕获了 `cart thumbnail` `link-name` bug 作为额外收获）。现在进行 S8-M2 —— `resolveInfoPage` RED 单元测试，然后是 `catch-all` 元数据：
现在进行 S8-M2 + S8-L5 的 RED 单元测试（两者都针对 `resolveInfoPage`/`pages.ts`），并一并扩展 `InfoPage`：
**RED 4/4.** Now the GREEN — extending `InfoPage` with `canonicalPath` + `description` and scoping `collection` to exact prefixes:
**S8-M2+L5 测试通过 — 单元测试 90/90。** 现在将其接入 catch-all 页面的 `generateMetadata` 中（目前它只发出 title）。正在读取：
现在进行 S8-L5 的 `/campaigns/christmas` 集合案例处理 —— 旧的规则 `campaigns/christmas` 包含一个集合，但我将其扩大到了没有集合的 `campaigns`。测试锁定了 `["campaigns","christmas"]` 必须为 `undefined`（仅精确前缀）。这是根据审计建议有意设计的。接下来是剩余的批量任务 — S8-L1 普查存在性检查，S8-L2 分页自引用规范（self-canonical），S8-I1 CSP `data:` 移除，SearchAction 一致性，S8-L3 依赖移除：
**S8-L1 GREEN (3/3)** — 普查现在验证每个 `/cat/` 和 `/p/` href 是否存在。进展顺利：S8-M2 元数据 + S8-L5 收藏范围已完成，普查已强化。现在开始处理 S8-L2（分页自规范）、S8-I1（CSP `data:`）、SearchAction 一致性、S8-L3（依赖项）：
Now S8-I1 (drop `data:` from CSP) and SearchAction parity:
现在正在更新 SearchAction 单元测试 pin（必须先行变红，变绿后进行调整），并检查引用它的 e2e：
现在正在将 S8-M2/L2 e2e 测试用例添加到 seo-platform.spec.ts 中，然后重新构建并运行所有内容：
购物车测试的 `toHaveCount(0)` 在空标题断言上存在不稳定（flaky）问题——页面在服务器渲染更新之前就进行了断言。在正常流程中，空标题会立即被服务端渲染……实际上问题恰恰相反：`toHaveCount(0)` 会立即成功（运行于购物车渲染完成前），导致后续的 `BILLY` 可见性检查失败（或者在这里，空标题断言在陈旧的空页面渲染时失败）。让我来优化这个等待逻辑：
**e2e 44/44.** Progress recap: S8-M2 (unique descriptions + prefix-canonicals, e2e-pinned), S8-L5 (collection scoping), S8-L1 (census existence), S8-L2 (paginated self-canonical, e2e-pinned), S8-I1 (CSP tightened), SearchAction parity, S8-L3 (dep removed) — all done. Live re-probes, then smoke + screenshots + docs:
所有实时探测结果均符合设计预期：`/customer-service/faq` 唯一描述 + 规范化（canonical）→ 前缀根路径；垃圾前缀路径同样规范化为前缀根路径（可索引但已折叠）；`/new/new-products` 渲染时**没有** Christmas rail（0 个 "Popular picks"）；垃圾路径依然返回 404；`SearchAction` 已移除；CSP 不包含 `data:`。现在我来更新截图并完善文档：
所有 25 个 SKIP 都是来自幂等重运行的已应用编辑。计数已更新到位。现在开始最后的完整门禁测试——单元测试、e2e ×3、冒烟测试，以及 `docs-counts` 测试（必须更新其常量以匹配 90/44）：
SKILL.md 的状态行未被替换 —— 我的最终文档脚本中的旧字符串与磁盘上的内容不符（第 275 行的首次 docsweep 编辑更改了该行，因此长替换失败了）。PAD:272 行处于历史修订块内（作为记录是正确的）。正在修复当前时态的 SKILL 状态行：
**Unit 90/90, docs-counts 7/7.** Final gate runs (e2e ×3 + smoke), then commit and push:
完整的门禁测试已通过。我将一次性提交所有内容，通过 SSH 封装器进行推送，并保存交付成果：
已推送并验证。正在保存交付物并进行收尾工作：
第 008 次会话已完成。最终报告：

## 第 008 次会话 — 已完成（已作为 `d9ef733` 推送到 `main` 分支，远程引用已通过 SSH 包装器验证）

**工作区与对齐** — 沙箱在会话之间重置：已在 `ef35f32` 重新克隆（操作员的提交仅为文档更新 — 包含 session-007 记录的 `docs/session_8.md`），从 `.env.example` 恢复了 `.env`，重新安装了 Playwright chromium，并从幸存的数据目录恢复了 PostgreSQL（此次重启清除了 `pg_logical/mappings` — 这是已知的循环故障模式，现已加入恢复列表）。基准测试通过，所有 session-007 的修复均已实时验证并保留。

**审计**（使用 web-application + tdd 技能的只读子代理 + 实时探测）：0 严重 · 0 高危 · **4 中危 · 6 低危 · 7 信息**。对每个延迟项目的判定：*不*适合更改 vitest/playwright 配置（缺口在于测试*内容*，而非配置 — 已做记录而非无意义的变更）；SearchAction 一致性极易实现，建议立即执行；迁移日志 + CSP nonces 建议稍后执行；Redis 限流器 / HSTS / LWW 建议/从未执行（已记录）。

**浏览器验证** (agent-browser)：移动端抽屉状态机全部通过 — 无 Tailwind v4 显示错误；hero popover；组合框 ArrowDown；完整的 购物车→结账→订单→追踪 往返流程。S8-M1 和 S8-M2 已在修复前实时确认。

**修复 (TDD，每个均为 RED→GREEN，plan-008)：**
- **S8-M2**：广泛的前缀已重新开启无限制的轻量内容爬取 — 每个合成页面现在都有唯一的描述 + 规范链接（canonical），将深层页面合并到前缀根目录（确切的前缀保持自引用）；已通过 e2e 锁定，实时验证，无用路径仍为 404。
- **S8-M1+L4**：**动态状态 axe 门控**（收藏、抽屉打开、购物车有商品、显示建议）— 它立即捕获了两个真实 Bug：按下状态的 Label-in-Name 违规（可见文本现已与 aria-label 匹配）以及一个未命名的购物车缩略图链接。
- **S8-L5**：收藏集栏现在仅在确切规则前缀上渲染（`/new/new-products` 不再显示圣诞节栏）。**S8-L1**：链接普查现在验证 `/cat/`+`/p/` 是否存在。**S8-L2**：分页的 `/cat` 页面自规范化（self-canonicalize）。**S8-I1**：删除了未使用的 CSP `data:`。**SearchAction**：为了保持机器人一致性已删除。**S8-L3**：删除了未使用的 `@vitejs/plugin-react`。
- **S8-M4+M3**：docs-counts 防护已扩展至 SKILL/DEPLOYMENT + sitemap/分类常量 — 在第 007 次会话遗漏的正好是那些漂移点时显示为 RED，随后在清扫后显示为 GREEN（"No CSP yet" ×4，种子计数 ×2，SKILL "276"）。

**最终门控**（退出代码检查）：lint 0/0 · 类型检查 ✓ · 类型检查:tests ✓ · **单元测试 90/90（14 个文件）** · 冷构建 ✓ · smoke 21/21 · **e2e 44/44 ×3** · sitemap 275 · 截图 12/12 PIL 有效，已刷新。文档：PAD v2.7.0，SKILL v1.7.0（第 16 课），AGENTS/CLAUDE/README/DEPLOYMENT，工作日志任务 126，session_8.md 记录，plan-008。`.env.example` 已验证同步并包含在提交中。仓库目录树整洁，`main` 分支已与 origin 同步。

**延期 (已记录)**：迁移日志 · CSP nonces · Redis 限流器 · HSTS · setCartQuantity LWW · vitest `isolate:false` 细节优化。

已为您保存在 download/ 目录下：[session-008_summary.md](/home/z/my-project/download/session-008_summary.md), [2026-11-20_session-008_remediation-plan.md](/home/z/my-project/download/2026-11-20_session-008_remediation-plan.md), [DEPLOYMENT.md](/home/z/my-project/download/DEPLOYMENT.md), [session_8.md](/home/z/my-project/download/session_8.md)。仓库位于 `/home/z/my-project/nordhem-furnishing-store`。您可以随时发送后续消息，从已保存的状态继续。

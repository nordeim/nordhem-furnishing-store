import { expect, test } from "@playwright/test";

/** Desktop storefront smoke: home renders seeded data, listing works, product page + search are live. */

test("home page renders hero, categories and product cards from the seeded catalog", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Product categories" }).first()).toBeVisible();
  // Seeded catalog: 242 products, 23 categories — assert a healthy floor, not exact counts.
  const cards = page.locator("a[href^='/p/']:visible");
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThanOrEqual(4);
});

test("category listing page shows products and paginates via the seeded collection", async ({ page }) => {
  await page.goto("/cat/storage-organisation-st001");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const cards = page.locator("a[href^='/p/']:visible");
  await expect(cards.first()).toBeVisible();
});

test("product page renders price, article number and add-to-cart", async ({ page }) => {
  await page.goto("/");
  const firstCard = page.locator("a[href^='/p/']:visible").first();
  const href = await firstCard.getAttribute("href");
  expect(href).toMatch(/^\/p\//);
  await firstCard.click();
  // Assert the URL changed: the home page also has an sr-only h1 and $-text, so without this
  // the assertions below could pass before client-side navigation completes.
  await expect(page).toHaveURL(/\/p\//);
  await expect(page.getByText(/Article no\./)).toBeVisible();
  await expect(page.getByText(/\$\d/).first()).toBeVisible();
});

test("header search suggests products and submits to the search page", async ({ page }) => {
  await page.goto("/");
  const box = page.locator("#site-search");
  await box.fill("billy");
  await expect(page.locator("ul[aria-label='Products']").first()).toBeVisible();
  // WAI-ARIA combobox: ArrowDown moves focus into the suggestion list (session-005 M-4).
  const panelId = await box.getAttribute("aria-controls");
  await box.press("ArrowDown");
  await expect(page.locator(`#${panelId} a`).first()).toBeFocused();
  await box.click();
  await box.press("Enter");
  await expect(page).toHaveURL(/\/search\?q=billy/);
  await expect(page.locator("a[href^='/p/']:visible").first()).toBeVisible();
});

test("cart flow: add → cart page shows the line → quantity badge updates", async ({ page, request }) => {
  const search = await request.get("/api/search?q=billy");
  const { products } = (await search.json()) as { products: { slug: string }[] };
  await page.goto(`/p/${products[0].slug}`);
  await page.getByRole("button", { name: "Add to shopping cart", exact: true }).click();
  await expect(page.getByText(/added to your shopping cart/i).first()).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Shopping cart", exact: true })).toBeVisible();
  await expect(page.locator("li").filter({ hasText: "$" }).first()).toBeVisible();
});

test("health endpoint responds ok", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});

test("hero hotspot popover opens, closes on Escape, and is not announced as a dialog", async ({ page }) => {
  await page.goto("/");
  const firstHotspot = page.getByRole("button", { name: /^Product information:/ }).first();
  await firstHotspot.click();
  const popover = page.getByTestId("hotspot-popover");
  await expect(popover).toBeVisible();
  // Non-modal by design: no dialog role, no aria-modal.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(popover).toHaveCount(0);
  await expect(firstHotspot).toBeVisible();
});

test("hero hotspot popover closes on outside click", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Product information:/ }).first().click();
  const popover = page.getByTestId("hotspot-popover");
  await expect(popover).toBeVisible();
  // A genuinely visible element outside the popover (the sr-only h1 is a 1x1px box —
  // pointer events there are intercepted by the article/header and never reach it).
  await page.getByRole("heading", { name: /Let the Christmas decorating begin/i }).click();
  await expect(popover).toHaveCount(0);
});

test("hero hotspot popover toggles closed by clicking its own button again", async ({ page }) => {
  await page.goto("/");
  const hotspot = page.getByRole("button", { name: /^Product information:/ }).first();
  await hotspot.click();
  const popover = page.getByTestId("hotspot-popover");
  await expect(popover).toBeVisible();
  // The button (or its inner dot) must toggle: pointerdown must not count as "outside".
  await hotspot.click();
  await expect(popover).toHaveCount(0);
  // And clicking the inner dot too — not just the button element itself.
  await hotspot.click();
  await expect(popover).toBeVisible();
  await hotspot.locator("span").click();
  await expect(popover).toHaveCount(0);
});

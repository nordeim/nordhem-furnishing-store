import { expect, test } from "@playwright/test";

/** SEO platform checks: sitemap, robots, manifest and JSON-LD all render with the right content. */

test("sitemap.xml lists home, categories and products, never private routes", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain("<loc>");
  expect(body).toMatch(/\/cat\//);
  expect(body).toMatch(/\/p\//);
  for (const route of ["/cart", "/checkout", "/orders/", "/track-order", "/favourites", "/search", "/api/"]) {
    expect(body, `sitemap must not expose ${route}`).not.toContain(route);
  }
});

test("robots.txt disallows private surfaces and points at the sitemap", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain("User-Agent: *");
  for (const route of ["/cart", "/checkout", "/orders/", "/track-order", "/favourites", "/search", "/api/"]) {
    expect(body).toContain(`Disallow: ${route}`);
  }
  expect(body).toContain("Sitemap: ");
});

test("manifest.webmanifest serves the PWA metadata", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest.name).toBe("Nordhem Furnishing Store");
  expect(manifest.icons.length).toBeGreaterThan(0);
});

test("home page carries Organization and WebSite JSON-LD", async ({ page }) => {
  await page.goto("/");
  const scripts = page.locator('script[type="application/ld+json"]');
  const count = await scripts.count();
  expect(count).toBeGreaterThanOrEqual(2);
  const bodies = await scripts.allTextContents();
  const parsed = bodies.map((body) => JSON.parse(body));
  expect(parsed.some((node) => node["@type"] === "Organization")).toBe(true);
  expect(parsed.some((node) => node["@type"] === "WebSite")).toBe(true);
});

test("product page carries Product JSON-LD with an offer", async ({ page }) => {
  await page.goto("/");
  await page.locator("a[href^='/p/']").first().click();
  const scripts = page.locator('script[type="application/ld+json"]');
  const bodies = await scripts.allTextContents();
  const product = bodies.map((body) => JSON.parse(body)).find((node) => node["@type"] === "Product");
  expect(product).toBeDefined();
  expect(product.offers.priceCurrency).toBe("SGD");
  expect(Number(product.offers.price)).toBeGreaterThan(0);
});

test("private pages carry noindex robots meta", async ({ page }) => {
  for (const path of ["/cart", "/checkout", "/track-order", "/favourites"]) {
    await page.goto(path);
    const meta = page.locator('meta[name="robots"]');
    await expect(meta, `${path} must be noindex`).toHaveAttribute("content", /noindex/);
  }
});

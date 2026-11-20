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
  // The first /p/ link in DOM order is the aria-hidden image link inside a carousel — click a
  // visible card title instead and WAIT for navigation, or the script read races the home page.
  await page.locator("a[href^='/p/']:visible").first().click();
  await page.waitForURL(/\/p\//);
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

test("security headers are present on every response (session-006 L-4)", async ({ request }) => {
  const response = await request.get("/");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(response.headers()["permissions-policy"]).toContain("camera=()");
  expect(response.headers()["x-powered-by"]).toBeUndefined();
});

test("Content-Security-Policy is set with the app's source allowlist (session-007 CSP)", async ({ request }) => {
  const response = await request.get("/");
  const csp = response.headers()["content-security-policy"];
  expect(csp).toBeDefined();
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("img-src 'self' https://www.ikea.com");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
});

test("unknown content paths return a real 404, not a soft-200 (session-006 M-3)", async ({ request }) => {
  const response = await request.get("/totally-unknown-page-xyz");
  expect(response.status()).toBe(404);
  const body = await response.text();
  expect(body).toContain("We couldn");
  // Session-007 L-6: the 404 surfaces its own title, not the site default.
  expect(body).toContain("Page not found");
});

test("product page exposes og:image and a twitter card (session-007 L-4)", async ({ page }) => {
  await page.goto("/p/billy-oxberg-bookcase-white-s69528344");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /ikea\.com|\/_next\//,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
});

test("category pages have a unique meta description (session-007 L-1)", async ({ page }) => {
  await page.goto("/cat/sofas-armchairs-700640");
  const description = await page.locator('meta[name="description"]').getAttribute("content");
  expect(description).toBeTruthy();
  expect(description).toContain("Sofas");
  expect(description).not.toBe(
    "Discover affordable furniture and home furnishing for all homes. Find quality storage solutions, mattresses, sofas and more. Be inspired and shop now!",
  );
});

test("footer long-tail links resolve — no dead content routes (session-007 M-2)", async ({ request }) => {
  for (const path of [
    "/planners/",
    "/customer-service/faq/",
    "/customer-service/returns-claims/guarantee/",
    "/this-is-ikea/about-us/",
    "/newsroom/",
    "/ikea-business/",
    "/campaigns/stay-cool-in-the-heat-pub521d0d30/",
  ]) {
    const response = await request.get(path);
    expect(response.status(), `${path} must resolve`).toBe(200);
  }
});

test("the health endpoint is never cached (session-007 L-3)", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("synthesized deep pages carry a unique description and fold into the prefix canonical (session-008 S8-M2)", async ({ page }) => {
  await page.goto("/customer-service/faq");
  // Unique, page-specific description (not the layout default).
  const description = await page.locator('meta[name="description"]').getAttribute("content");
  expect(description).toBeTruthy();
  expect(description).toContain("Faq");
  expect(description).not.toBe(
    "Discover affordable furniture and home furnishing for all homes. Find quality storage solutions, mattresses, sofas and more. Be inspired and shop now!",
  );
  // The deep page canonicalizes to the prefix root; the exact prefix keeps its self-canonical.
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/customer-service$/);
  await page.goto("/planners/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/planners$/);
});

test("paginated category pages self-canonicalize (session-008 S8-L2)", async ({ page }) => {
  await page.goto("/cat/lowest-price?page=2");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/cat\/lowest-price\?page=2$/);
  await page.goto("/cat/lowest-price");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/cat\/lowest-price$/);
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Pins the sitemap/robots route contracts WITHOUT a database: the route modules are read as
 * text and their exported shape asserted. The privacy contract matters most — private
 * surfaces (cart, checkout, orders, track-order, favourites, search, api) must never appear
 * in the sitemap, and robots must disallow them.
 */

const SITEMAP_SRC = readFileSync("src/app/sitemap.ts", "utf8");
const ROBOTS_SRC = readFileSync("src/app/robots.ts", "utf8");

/** Routes that exist for an individual shopper's session — never indexable. */
const PRIVATE_ROUTES = ["/cart", "/checkout", "/orders/", "/track-order", "/favourites", "/search", "/api/"];

/** Routes that must be present for the storefront to be discoverable. */
const PUBLIC_ROUTES = [
  "/",
  "/ikea-family",
  "/cat/",
  "/p/",
  // Indexable long-tail info routes (session-005 L-7): linked from nav/footer, 200-status.
  // Session-009 S9-L2: only CANONICAL roots are listed — the deep entries
  // (/campaigns/christmas, /customer-service/services, …/return-policy) canonicalize to
  // /campaigns and /customer-service (session-008 S8-M2 folding), so advertising them in
  // the sitemap meant advertising non-canonical URLs whose canonical targets were absent.
  "/offers",
  "/rooms",
  "/stores",
  "/ideas",
  "/new",
  "/campaigns",
  "/customer-service",
  "/product-guides/sustainable-products",
];

/** Deep info URLs whose canonical folds to a prefix root — must NOT be sitemapped. */
const NON_CANONICAL_ROUTES = [
  "/campaigns/christmas",
  "/customer-service/services",
  "/customer-service/returns-claims/return-policy",
];

describe("sitemap route contract (src/app/sitemap.ts)", () => {
  it("is a MetadataRoute.Sitemap export consumed by Next at /sitemap.xml", () => {
    expect(SITEMAP_SRC).toContain("MetadataRoute.Sitemap");
    expect(SITEMAP_SRC).toContain("export default");
  });

  it("derives the origin from siteBaseUrl (single source of truth)", () => {
    expect(SITEMAP_SRC).toContain("siteBaseUrl");
  });

  it("survives a database outage at build time (static routes still emitted)", () => {
    expect(SITEMAP_SRC).toMatch(/try\s*{[\s\S]*catch/);
  });

  it("includes every public route family", () => {
    for (const route of PUBLIC_ROUTES) {
      expect(SITEMAP_SRC, `sitemap must cover ${route}`).toContain(`"${route}`);
    }
  });

  it("lists only canonical info URLs (deep pages fold into their prefix roots)", () => {
    for (const route of NON_CANONICAL_ROUTES) {
      expect(SITEMAP_SRC, `sitemap must not advertise non-canonical ${route}`).not.toContain(`"${route}`);
    }
  });

  it("never exposes private session surfaces", () => {
    for (const route of PRIVATE_ROUTES) {
      expect(SITEMAP_SRC, `sitemap must NOT contain ${route}`).not.toContain(`"${route}`);
    }
  });
});

describe("robots route contract (src/app/robots.ts)", () => {
  it("allows all user agents", () => {
    expect(ROBOTS_SRC).toContain('userAgent: "*"');
  });

  it("disallows the private session surfaces", () => {
    for (const route of PRIVATE_ROUTES) {
      expect(ROBOTS_SRC, `robots must disallow ${route}`).toContain(route);
    }
  });

  it("points crawlers at the sitemap", () => {
    expect(ROBOTS_SRC).toContain("sitemap.xml");
  });
});

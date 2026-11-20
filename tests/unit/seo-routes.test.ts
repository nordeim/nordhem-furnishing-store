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
const PUBLIC_ROUTES = ["/", "/ikea-family", "/cat/", "/p/"];

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

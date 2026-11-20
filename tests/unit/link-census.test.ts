import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isKnownInfoPath, resolveInfoPage } from "@/content/pages";
import home from "@/content/home.json";
import catalog from "@/content/catalog.json";

/**
 * Session-007 M-2 pin: every internal link the site actually renders (sitewide footer +
 * home-page card sections) must resolve — to an app route (/, /cat/*, /p/*, /cart, …), a
 * known info-page rule, or an external URL. Pre-fix, 17 footer/home links 404'd because the
 * RULES prefixes covered only part of the long tail that the soft-404 fix (session-006 M-3)
 * started rejecting for real.
 *
 * Session-008 S8-L1: /cat/ and /p/ hrefs are additionally checked for EXISTENCE against the
 * catalog — a typo'd slug would otherwise pass the prefix check and 404 live.
 */
const NAV_SRC = readFileSync("src/content/nav.ts", "utf8");

/** App routes that exist as real pages (not the catch-all). */
const APP_ROUTES = new Set([
  "/", "/cart", "/checkout", "/favourites", "/ikea-family", "/search", "/track-order",
]);

const CATEGORY_SLUGS = new Set(
  (catalog as Array<{ category?: string }>).map((entry) => entry.category).filter(Boolean) as string[],
);
const PRODUCT_SLUGS = new Set(
  (catalog as Array<{ slug?: string }>).map((entry) => entry.slug).filter(Boolean) as string[],
);
// The seed derives category rows from home.json's categoryNav hrefs (plus the synthetic
// collection below) — mirror that derivation so the census stays honest.
for (const category of home.categoryNav) {
  const slug = category.href.replace(/^\/cat\//, "").replace(/\/+$/, "");
  if (slug) CATEGORY_SLUGS.add(slug);
}
CATEGORY_SLUGS.add("lowest-price"); // the one synthetic collection (session-007 M-4)

function classify(href: string): "app" | "cat" | "known-info" | "external" | "dead" {
  if (/^https?:\/\//.test(href)) return "external";
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return "external";
  const path = href.split("#")[0].replace(/\/+$/, "");
  if (APP_ROUTES.has(path)) return "app";
  if (path.startsWith("/cat/")) {
    return CATEGORY_SLUGS.has(path.slice("/cat/".length)) ? "cat" : "dead";
  }
  if (path.startsWith("/p/")) {
    return PRODUCT_SLUGS.has(path.slice("/p/".length)) ? "cat" : "dead";
  }
  if (path === "") return "app"; // bare "#anchor" on the current page
  const segments = path.replace(/^\//, "").split("/");
  return isKnownInfoPath(segments) ? "known-info" : "dead";
}

/** Pull every string that looks like an internal href out of the rendered-content sources. */
function internalHrefs(): string[] {
  const hrefs = new Set<string>();
  // nav.ts: href:"..." literals in footerColumns/primaryNav/socialLinks
  for (const m of NAV_SRC.matchAll(/href:\s*"([^"]+)"/g)) hrefs.add(m[1]);
  // home.json: every href field, recursively
  const walk = (node: unknown): void => {
    if (typeof node === "string") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (key === "href" && typeof value === "string") hrefs.add(value);
        else walk(value);
      }
    }
  };
  walk(home);
  return [...hrefs];
}

describe("rendered internal links resolve (footer + home sections)", () => {
  it("every footer/home href is an app route, category/product, known info page, or external", () => {
    const dead = internalHrefs().filter((href) => classify(href) === "dead");
    expect(dead, `dead links (must extend src/content/pages.ts RULES): ${dead.join(", ")}`).toEqual([]);
  });

  it("the footer long-tail prefixes resolve with derived titles (regression guard for the 17)", () => {
    for (const path of [
      "planners", "ikea-business", "newsroom", "newsroom/media-resources",
      "customer-service/faq", "customer-service/product-support/recalls",
      "this-is-ikea/about-us", "this-is-ikea/work-with-us",
      "campaigns/stay-cool-in-the-heat-pub521d0d30",
    ]) {
      const segments = path.split("/");
      expect(isKnownInfoPath(segments), path).toBe(true);
      const page = resolveInfoPage(segments);
      expect(page.title.length, `${path} title`).toBeGreaterThan(0);
    }
  });

  it("garbage paths stay 404 (the session-006 M-3 guarantee holds after the extension)", () => {
    expect(isKnownInfoPath(["totally-unknown-page-xyz"])).toBe(false);
    expect(isKnownInfoPath(["customer-service-typo"])).toBe(false);
    expect(isKnownInfoPath(["this-is-ikea-typo"])).toBe(false);
    expect(isKnownInfoPath(["newsroom", "totally", "made", "up", "six", "segments"])).toBe(true); // prefix-covered, slug-derived (by design)
  });
});

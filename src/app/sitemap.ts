import type { MetadataRoute } from "next";
import { listAllCategorySlugs, listAllProductSlugs } from "@/lib/catalog";
import { logError } from "@/lib/http";
import { siteBaseUrl } from "@/lib/seo";

/**
 * /sitemap.xml — static storefront routes + every category and product page.
 * Private session surfaces (cart, checkout, orders, track-order, favourites, search, api)
 * are deliberately absent — pinned by tests/unit/seo-routes.test.ts.
 * A database outage at build time degrades to the static routes instead of failing the build.
 */
/** The DB-independent route paths — the exact set the outage degrade path emits
 * (session-010 S10-L4: exported so the degrade contract is asserted directly). */
export const STATIC_SITEMAP_ROUTES = ["/", "/ikea-family"] as const;
export const INFO_SITEMAP_ROUTES = [
  "/offers",
  "/rooms",
  "/stores",
  "/ideas",
  "/new",
  "/campaigns",
  "/customer-service",
  "/product-guides/sustainable-products",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBaseUrl();
  const staticRoutes: MetadataRoute.Sitemap = STATIC_SITEMAP_ROUTES.map((path) =>
    path === "/"
      ? { url: base + path, changeFrequency: "daily" as const, priority: 1.0 }
      : { url: base + path, changeFrequency: "monthly" as const, priority: 0.5 },
  );

  // Indexable long-tail content routes (linked from nav/footer) — session-005 L-7: they were
  // absent from the sitemap, leaving discoverable pages invisible to crawlers.
  // Session-009 S9-L2: only CANONICAL roots are listed. The deep footer URLs
  // (/campaigns/christmas, /customer-service/services, …/return-policy) canonicalize to
  // their prefix roots (session-008 S8-M2 folding), so sitemapping them advertised
  // non-canonical URLs while their canonical targets were absent from the map.
  const infoRoutes: MetadataRoute.Sitemap = INFO_SITEMAP_ROUTES.map((path) => ({
    url: base + path,
    changeFrequency: "weekly" as const,
    priority: 0.4,
  }));

  try {
    const [categorySlugs, productSlugs] = await Promise.all([listAllCategorySlugs(), listAllProductSlugs()]);
    const categoryRoutes: MetadataRoute.Sitemap = categorySlugs.map(({ slug }) => ({
      url: base + "/cat/" + slug,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
    const productRoutes: MetadataRoute.Sitemap = productSlugs.map(({ slug }) => ({
      url: base + "/p/" + slug,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
    return [...staticRoutes, ...infoRoutes, ...categoryRoutes, ...productRoutes];
  } catch (error) {
    logError("sitemap.db_unavailable", error); // never ship a silent 2-URL sitemap
    return [...staticRoutes, ...infoRoutes];
  }
}

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
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBaseUrl();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base + "/", changeFrequency: "daily", priority: 1.0 },
    { url: base + "/ikea-family", changeFrequency: "monthly", priority: 0.5 },
  ];

  // Indexable long-tail content routes (linked from nav/footer) — session-005 L-7: they were
  // absent from the sitemap, leaving 9 discoverable pages invisible to crawlers.
  const infoRoutes: MetadataRoute.Sitemap = [
    "/offers",
    "/rooms",
    "/stores",
    "/ideas",
    "/new",
    "/campaigns/christmas",
    "/customer-service/services",
    "/customer-service/returns-claims/return-policy",
    "/product-guides/sustainable-products",
  ].map((path) => ({ url: base + path, changeFrequency: "weekly" as const, priority: 0.4 }));

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

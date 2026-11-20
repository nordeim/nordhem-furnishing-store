import type { MetadataRoute } from "next";
import { listAllCategorySlugs, listAllProductSlugs } from "@/lib/catalog";
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
    return [...staticRoutes, ...categoryRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}

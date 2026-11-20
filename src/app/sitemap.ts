import type { MetadataRoute } from "next";
import { getNavCategories, listProducts } from "@/lib/catalog";
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
    const [categories, products] = await Promise.all([getNavCategories(), listProducts({ page: 1 })]);
    const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
      url: base + "/cat/" + category.slug,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
    // First page of products (24/page); the catalog is a demo set — every product fits the first page.
    const productRoutes: MetadataRoute.Sitemap = products.items.map((product) => ({
      url: base + "/p/" + product.slug,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
    return [...staticRoutes, ...categoryRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}

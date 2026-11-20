import type { MetadataRoute } from "next";
import { siteBaseUrl } from "@/lib/seo";

/**
 * /robots.txt — allow the storefront, keep crawlers out of session surfaces and the API.
 * Mirrors the sitemap privacy contract (tests/unit/seo-routes.test.ts).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cart", "/checkout", "/orders/", "/track-order", "/favourites", "/search", "/api/"],
    },
    sitemap: siteBaseUrl() + "/sitemap.xml",
  };
}

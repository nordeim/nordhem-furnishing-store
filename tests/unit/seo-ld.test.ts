import { describe, expect, it } from "vitest";
import { buildOrganizationJsonLd, buildWebsiteJsonLd, siteBaseUrl } from "@/lib/seo";

describe("siteBaseUrl", () => {
  it("uses NEXT_PUBLIC_SITE_URL when set", () => {
    expect(siteBaseUrl("https://store.example.com")).toBe("https://store.example.com");
  });

  it("strips trailing slashes", () => {
    expect(siteBaseUrl("https://store.example.com///")).toBe("https://store.example.com");
  });

  it("falls back to localhost for local development", () => {
    expect(siteBaseUrl(undefined)).toBe("http://localhost:3000");
    expect(siteBaseUrl("")).toBe("http://localhost:3000");
  });
});

describe("JSON-LD builders", () => {
  it("builds an Organization node with the site url", () => {
    const node = buildOrganizationJsonLd("https://store.example.com");
    expect(node).toEqual({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Nordhem Furnishing Store",
      url: "https://store.example.com",
    });
  });

  it("builds a WebSite node with a SearchAction pointing at /search", () => {
    const node = buildWebsiteJsonLd("https://store.example.com");
    expect(node["@type"]).toBe("WebSite");
    expect(node.url).toBe("https://store.example.com");
    expect(node.potentialAction).toEqual({
      "@type": "SearchAction",
      target: "https://store.example.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    });
  });
});

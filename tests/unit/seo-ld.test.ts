import { describe, expect, it } from "vitest";
import { buildOrganizationJsonLd, buildWebsiteJsonLd, jsonLdScript, siteBaseUrl } from "@/lib/seo";

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

  it("builds a WebSite node WITHOUT a SearchAction — /search is robots-disallowed (session-008 parity)", () => {
    const node = buildWebsiteJsonLd("https://store.example.com");
    expect(node["@type"]).toBe("WebSite");
    expect(node.url).toBe("https://store.example.com");
    // Advertising a sitelinks searchbox would point crawlers at a disallowed target.
    expect("potentialAction" in node).toBe(false);
  });
});

describe("jsonLdScript (injection escaping)", () => {
  it("escapes < so a payload can never terminate the script element", () => {
    expect(jsonLdScript({ name: "</script><script>alert(1)</script>" })).not.toContain("<");
    expect(jsonLdScript({ name: "a<b" })).toContain("\\u003c");
  });

  it("round-trips through JSON.parse with the original string", () => {
    const hostile = "</script>";
    expect(JSON.parse(jsonLdScript({ name: hostile })).name).toBe(hostile);
  });
});

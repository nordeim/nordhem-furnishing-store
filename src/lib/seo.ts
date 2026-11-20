/** SEO helpers — the single source of truth for the canonical public origin. */

export function siteBaseUrl(envValue?: string): string {
  const base = envValue ?? process.env.NEXT_PUBLIC_SITE_URL;
  return (base || "http://localhost:3000").replace(/\/+$/, "");
}

export function buildOrganizationJsonLd(base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Nordhem Furnishing Store",
    url: base,
  };
}

export function buildWebsiteJsonLd(base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Nordhem Furnishing Store",
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: `${base}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/** Serialise a JSON-LD node for an inline <script> — "<" is escaped so the payload can never terminate the element. */
export function jsonLdScript(node: object): string {
  return JSON.stringify(node).replace(/</g, "\\u003c");
}

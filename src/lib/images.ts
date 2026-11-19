export type ImageSize = "s" | "m" | "l" | "xl";

const IMWIDTH: Record<ImageSize, number> = { s: 160, m: 320, l: 640, xl: 1200 };
const IKEA_HOST = "www.ikea.com";

/**
 * Builds a sized URL for an IKEA-hosted asset. Range-categorisation tiles are sized with
 * `imwidth`; all other IKEA media use the `f` size flag. Non-IKEA and relative URLs pass through.
 */
export function imageUrl(src: string, size: ImageSize = "m"): string {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  if (url.hostname !== IKEA_HOST) return src;

  url.search = "";
  if (url.pathname.includes("/range-categorisation/")) {
    url.searchParams.set("imwidth", String(IMWIDTH[size]));
  } else {
    url.searchParams.set("f", size);
  }
  return url.toString();
}

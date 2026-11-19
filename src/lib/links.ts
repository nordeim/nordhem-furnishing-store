export function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/**
 * Scraped IKEA paths carry trailing slashes ("/offers/"); Next canonicalises without them, so
 * normalise up front and avoid a redirect hop on every click. Query strings and hashes are kept.
 */
export function toHref(href: string): string {
  if (isExternal(href)) return href;
  const match = /^([^?#]*)(.*)$/.exec(href);
  const path = match?.[1] ?? href;
  const rest = match?.[2] ?? "";
  const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return `${trimmed || "/"}${rest}`;
}

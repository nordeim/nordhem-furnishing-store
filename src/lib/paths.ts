/** Escapes LIKE/ILIKE wildcards so user input is matched literally. */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Collapses whitespace and bounds length so search terms are safe to store, log and query. */
export function normaliseQuery(input: string | undefined | null, maxLength = 80): string {
  if (!input) return "";
  return input.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

/** Last meaningful path segment of an IKEA-style URL path ("/cat/sofas-700640/" → "sofas-700640"). */
export function lastSegment(path: string): string {
  return path.split(/[?#]/)[0].split("/").filter(Boolean).pop() ?? "";
}

export function slugToTitle(slug: string): string {
  const cleaned = slug
    .replace(/-pub[0-9a-f]{6,}$/i, "")
    .replace(/-[a-z]{1,3}\d{3}$/i, "")
    .replace(/-\d{4,}$/, "");
  const words = cleaned.split("-").filter(Boolean);
  if (words.length === 0) return "IKEA Singapore";
  const sentence = words.join(" ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

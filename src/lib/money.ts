export interface PriceParts {
  dollars: string;
  cents: string;
}

/** Splits integer cents into display parts, matching IKEA's "$29 .90" super-aligned layout. */
export function splitPrice(priceCents: number): PriceParts {
  if (!Number.isInteger(priceCents) || priceCents < 0) {
    throw new RangeError(`priceCents must be a non-negative integer, received ${priceCents}`);
  }
  const dollars = Math.floor(priceCents / 100);
  return {
    dollars: dollars.toLocaleString("en-SG"),
    cents: String(priceCents % 100).padStart(2, "0"),
  };
}

export function formatPrice(priceCents: number): string {
  const { dollars, cents } = splitPrice(priceCents);
  return `$${dollars}.${cents}`;
}

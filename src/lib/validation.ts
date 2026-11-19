import { z } from "zod";
import { MAX_LINE_QUANTITY } from "@/lib/cart-math";

const productId = z.number().int().positive();
const quantity = z.number().int().min(1).max(MAX_LINE_QUANTITY);

export const cartAddSchema = z.object({
  productId,
  quantity: quantity.default(1),
});

export const cartSetSchema = z.object({ productId, quantity });
export const cartRemoveSchema = z.object({ productId });
export const favouriteSchema = z.object({ productId });

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);

export const checkoutSchema = z.object({
  name: trimmed(2, 80),
  email: z.string().trim().toLowerCase().email().max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{8,20}$/, "Enter a valid phone number"),
  address: trimmed(5, 200),
  postalCode: z.string().trim().regex(/^\d{6}$/, "Singapore postal codes have 6 digits"),
  method: z.enum(["delivery", "click-collect"]),
});

export const familySchema = z.object({
  name: trimmed(2, 80),
  email: z.string().trim().toLowerCase().email().max(120),
  marketingConsent: z.boolean().default(false),
});

export const ORDER_NO_PATTERN = /^IKSG-\d{10}$/;

export const trackOrderSchema = z.object({
  orderNo: z.string().trim().toUpperCase().regex(ORDER_NO_PATTERN, "Order numbers look like IKSG-0123456789"),
  email: z.string().trim().toLowerCase().email().max(120),
});

export const SORT_OPTIONS = ["relevance", "price-asc", "price-desc", "name-asc", "rating"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const PAGE_SIZE = 24;

const optionalDollars = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined || value.trim() === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : undefined;
  });

/** Lenient parser for URL query strings: bad values fall back to defaults instead of erroring. */
export const listingQuerySchema = z.object({
  sort: z.enum(SORT_OPTIONS).catch("relevance").default("relevance"),
  page: z.coerce.number().int().min(1).max(500).catch(1).default(1),
  min: optionalDollars,
  max: optionalDollars,
});

export type ListingQuery = z.infer<typeof listingQuerySchema>;

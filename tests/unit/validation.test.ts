import { describe, expect, it } from "vitest";
import {
  cartAddSchema,
  checkoutSchema,
  listingQuerySchema,
  trackOrderSchema,
} from "@/lib/validation";

const validCheckout = {
  name: "Mei Lin",
  email: "  Mei@Example.COM ",
  phone: "+65 9123 4567",
  address: "1 Jurong West Street 21",
  postalCode: "649423",
  method: "delivery",
};

describe("cart schemas", () => {
  it("defaults quantity to 1", () => {
    expect(cartAddSchema.parse({ productId: 7 })).toEqual({ productId: 7, quantity: 1 });
  });

  it.each([{ productId: 0 }, { productId: 1.5 }, { productId: "3" }, { productId: 1, quantity: 100 }, { productId: 1, quantity: 0 }])(
    "rejects %o",
    (input) => {
      expect(cartAddSchema.safeParse(input).success).toBe(false);
    },
  );
});

describe("checkout schema", () => {
  it("normalises email casing and whitespace", () => {
    expect(checkoutSchema.parse(validCheckout).email).toBe("mei@example.com");
  });

  it("rejects non-Singapore postal codes", () => {
    const result = checkoutSchema.safeParse({ ...validCheckout, postalCode: "1234" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown delivery methods", () => {
    expect(checkoutSchema.safeParse({ ...validCheckout, method: "drone" }).success).toBe(false);
  });
});

describe("track order schema", () => {
  it("accepts a lower-case order number and upper-cases it", () => {
    const parsed = trackOrderSchema.parse({ orderNo: "iksg-0123456789", email: "a@b.co" });
    expect(parsed.orderNo).toBe("IKSG-0123456789");
  });

  it("rejects malformed order numbers", () => {
    expect(trackOrderSchema.safeParse({ orderNo: "123", email: "a@b.co" }).success).toBe(false);
  });
});

describe("listing query schema", () => {
  it("falls back to defaults for hostile or malformed values", () => {
    const parsed = listingQuerySchema.parse({ sort: "DROP TABLE", page: "-4", min: "abc", max: "" });
    expect(parsed).toEqual({ sort: "relevance", page: 1, min: undefined, max: undefined });
  });

  it("rejects overflow dollar bounds instead of passing unbounded cents to the DB (session-013 S13-M1)", () => {
    // 1e308 dollars -> Math.round(1e308*100) === Infinity; 1e17 dollars -> 1e19 cents
    // (over int8 max). Both used to flow straight into the gte/lte binds and 500 the
    // page — the schema's contract is "bad values fall back to defaults instead of
    // erroring" (live-confirmed: /cat/*?max=1e308 -> 500, /search?q=billy&max=1e17 -> 500).
    const parsed = listingQuerySchema.parse({ min: "1e308", max: "1e17" });
    expect(parsed.min).toBeUndefined();
    expect(parsed.max).toBeUndefined();
    // Boundary: int32-max cents ($21,474,836.47) is the ceiling; one cent more drops out.
    expect(listingQuerySchema.parse({ min: "21474836.47" }).min).toBe(2147483647);
    expect(listingQuerySchema.parse({ max: "21474836.48" }).max).toBeUndefined();
  });

  it("non-string filter inputs fall back instead of throwing (session-014 S14-I3)", () => {
    // searchParams always yield strings, but the schema's documented contract is
    // "bad values fall back to defaults instead of erroring" — a schema reused outside
    // the searchParams path should not throw on a number/null min. The sibling fields
    // (sort, page) already carry .catch; min/max now do too.
    const parsed = listingQuerySchema.parse({ min: 5, max: null });
    expect(parsed.min).toBeUndefined();
    expect(parsed.max).toBeUndefined();
  });

  it("converts dollar bounds to cents", () => {
    const parsed = listingQuerySchema.parse({ sort: "price-asc", page: "3", min: "10.5", max: "99" });
    expect(parsed).toEqual({ sort: "price-asc", page: 3, min: 1050, max: 9900 });
  });
});

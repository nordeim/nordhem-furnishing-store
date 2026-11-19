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

  it("converts dollar bounds to cents", () => {
    const parsed = listingQuerySchema.parse({ sort: "price-asc", page: "3", min: "10.5", max: "99" });
    expect(parsed).toEqual({ sort: "price-asc", page: 3, min: 1050, max: 9900 });
  });
});

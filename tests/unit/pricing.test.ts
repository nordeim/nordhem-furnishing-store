import { describe, expect, it } from "vitest";
import {
  computeTotals,
  DELIVERY_FEE_CENTS,
  FREE_DELIVERY_THRESHOLD_CENTS,
} from "@/lib/cart-math";
import { formatPrice, splitPrice } from "@/lib/money";

describe("money formatting", () => {
  it("formats integer cents as SGD with two decimals", () => {
    expect(formatPrice(2990)).toBe("$29.90");
    expect(formatPrice(5)).toBe("$0.05");
    expect(formatPrice(123456)).toBe("$1,234.56");
  });

  it("splits price parts for the super-aligned display", () => {
    expect(splitPrice(36900)).toEqual({ dollars: "369", cents: "00" });
  });

  it("rejects fractional or negative cents instead of rendering garbage", () => {
    expect(() => splitPrice(10.5)).toThrow(RangeError);
    expect(() => splitPrice(-1)).toThrow(RangeError);
  });
});

describe("cart totals", () => {
  it("returns zeros for an empty cart, even for delivery", () => {
    expect(computeTotals([], "delivery")).toEqual({
      itemCount: 0,
      subtotalCents: 0,
      deliveryCents: 0,
      totalCents: 0,
      freeDeliveryRemainingCents: 0,
    });
  });

  it("adds the delivery fee below the free-delivery threshold", () => {
    const totals = computeTotals([{ unitPriceCents: 2990, quantity: 2 }], "delivery");
    expect(totals.subtotalCents).toBe(5980);
    expect(totals.deliveryCents).toBe(DELIVERY_FEE_CENTS);
    expect(totals.totalCents).toBe(5980 + DELIVERY_FEE_CENTS);
    expect(totals.freeDeliveryRemainingCents).toBe(FREE_DELIVERY_THRESHOLD_CENTS - 5980);
  });

  it("waives delivery exactly at the threshold", () => {
    const totals = computeTotals(
      [{ unitPriceCents: FREE_DELIVERY_THRESHOLD_CENTS, quantity: 1 }],
      "delivery",
    );
    expect(totals.deliveryCents).toBe(0);
    expect(totals.freeDeliveryRemainingCents).toBe(0);
  });

  it("never charges delivery for click & collect", () => {
    expect(computeTotals([{ unitPriceCents: 100, quantity: 1 }], "click-collect").deliveryCents).toBe(0);
  });

  it("rejects out-of-range quantities", () => {
    expect(() => computeTotals([{ unitPriceCents: 100, quantity: 0 }], "delivery")).toThrow(RangeError);
    expect(() => computeTotals([{ unitPriceCents: 100, quantity: 100 }], "delivery")).toThrow(RangeError);
  });
});

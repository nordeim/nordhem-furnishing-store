/** Demo shipping configuration — change here only; the server is the sole authority on totals. */
export const DELIVERY_FEE_CENTS = 4900;
export const FREE_DELIVERY_THRESHOLD_CENTS = 50000;
export const MAX_LINE_QUANTITY = 99;

export type DeliveryMethod = "delivery" | "click-collect";

export interface PricedLine {
  unitPriceCents: number;
  quantity: number;
}

export interface CartTotals {
  itemCount: number;
  subtotalCents: number;
  deliveryCents: number;
  totalCents: number;
  /** Cents remaining until delivery becomes free; 0 when already free or not applicable. */
  freeDeliveryRemainingCents: number;
}

export function computeTotals(lines: readonly PricedLine[], method: DeliveryMethod): CartTotals {
  let itemCount = 0;
  let subtotalCents = 0;
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_LINE_QUANTITY) {
      throw new RangeError(`Invalid line quantity ${line.quantity}`);
    }
    itemCount += line.quantity;
    subtotalCents += line.unitPriceCents * line.quantity;
  }

  const eligibleForDelivery = itemCount > 0 && method === "delivery";
  const isFree = subtotalCents >= FREE_DELIVERY_THRESHOLD_CENTS;
  const deliveryCents = eligibleForDelivery && !isFree ? DELIVERY_FEE_CENTS : 0;

  return {
    itemCount,
    subtotalCents,
    deliveryCents,
    totalCents: subtotalCents + deliveryCents,
    freeDeliveryRemainingCents:
      eligibleForDelivery && !isFree ? FREE_DELIVERY_THRESHOLD_CENTS - subtotalCents : 0,
  };
}

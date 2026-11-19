"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { AppLink } from "@/components/ui/app-link";
import { SmartImage } from "@/components/ui/smart-image";
import { MAX_LINE_QUANTITY, FREE_DELIVERY_THRESHOLD_CENTS } from "@/lib/cart-math";
import { applyCartCount, request } from "@/lib/client/shopping-store";
import { formatPrice } from "@/lib/money";
import type { CartSnapshot } from "@/lib/shopping";

export function CartView({ initial }: { initial: CartSnapshot }) {
  const [cart, setCart] = useState(initial);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function mutate(productId: number, method: "PATCH" | "DELETE", quantity?: number) {
    setBusyId(productId);
    setError(null);
    const result = await request<CartSnapshot>("/api/cart", method, method === "PATCH" ? { productId, quantity } : { productId });
    setBusyId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCart(result.data);
    applyCartCount(result.data.totals.itemCount);
  }

  if (cart.lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-bold">Your shopping cart is empty</h2>
        <p className="mt-2 text-sm text-ink-soft">Find something you love and it will show up here.</p>
        <AppLink href="/" className="btn btn-dark mt-6">
          Continue shopping
        </AppLink>
      </div>
    );
  }

  const { totals } = cart;
  const progress = Math.min(100, (totals.subtotalCents / FREE_DELIVERY_THRESHOLD_CENTS) * 100);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div>
        {error && (
          <p role="alert" className="mb-4 rounded bg-negative/10 p-3 text-sm font-bold text-negative">
            {error}
          </p>
        )}
        <ul className="divide-y divide-line border-y border-line">
          {cart.lines.map((line) => {
            const busy = busyId === line.productId;
            return (
              <li key={line.productId} className="flex gap-4 py-5" aria-busy={busy}>
                <AppLink href={`/p/${line.slug}`} className="shrink-0">
                  <SmartImage src={line.image} alt="" size="s" className="size-24 object-contain mix-blend-multiply md:size-32" />
                </AppLink>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <AppLink href={`/p/${line.slug}`} className="text-base font-bold hover:underline">
                        {line.name}
                      </AppLink>
                      <p className="text-sm text-ink-soft">{line.typeDesc}</p>
                    </div>
                    <p className="text-base font-bold">{formatPrice(line.unitPriceCents * line.quantity)}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div role="group" aria-label={`Quantity for ${line.name}`} className="flex items-center rounded-full border border-line-strong">
                      <button type="button" aria-label="Decrease quantity" disabled={busy || line.quantity <= 1} onClick={() => mutate(line.productId, "PATCH", line.quantity - 1)} className="grid size-11 place-items-center rounded-full hover:bg-surface disabled:text-line-strong">
                        <Icon name="minus" className="size-4" />
                      </button>
                      <output aria-live="polite" className="w-8 text-center text-sm font-bold">
                        {line.quantity}
                      </output>
                      <button type="button" aria-label="Increase quantity" disabled={busy || line.quantity >= MAX_LINE_QUANTITY} onClick={() => mutate(line.productId, "PATCH", line.quantity + 1)} className="grid size-11 place-items-center rounded-full hover:bg-surface disabled:text-line-strong">
                        <Icon name="plus" className="size-4" />
                      </button>
                    </div>
                    <button type="button" disabled={busy} onClick={() => mutate(line.productId, "DELETE")} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold underline hover:bg-surface">
                      <Icon name="trash" className="size-4" />
                      Remove<span className="sr-only"> {line.name}</span>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <aside aria-label="Order summary" className="h-fit rounded-lg bg-surface p-6">
        <h2 className="text-xl font-bold">Order summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>Items ({totals.itemCount})</dt>
            <dd className="font-bold">{formatPrice(totals.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between text-ink-soft">
            <dt>Delivery</dt>
            <dd>Calculated at checkout</dd>
          </div>
        </dl>
        <div className="mt-5">
          <div className="h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Progress to free delivery">
            <div className="h-full bg-positive" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            {totals.subtotalCents >= FREE_DELIVERY_THRESHOLD_CENTS
              ? "You’ve unlocked free home delivery."
              : `Add ${formatPrice(FREE_DELIVERY_THRESHOLD_CENTS - totals.subtotalCents)} more for free home delivery.`}
          </p>
        </div>
        <AppLink href="/checkout" className="btn btn-primary mt-6 w-full">
          Go to checkout
        </AppLink>
      </aside>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { addToCart, ensureSummaryLoaded, toggleFavourite, useShopping } from "@/lib/client/shopping-store";
import { MAX_LINE_QUANTITY } from "@/lib/cart-math";

interface ProductRef {
  productId: number;
  name: string;
}

export function FavouriteButton({
  productId,
  name,
  className,
  label,
  refreshOnChange = false,
}: ProductRef & { className?: string; label?: boolean; refreshOnChange?: boolean }) {
  const { favouriteIds } = useShopping();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  useEffect(() => ensureSummaryLoaded(), []);

  const active = favouriteIds.includes(productId);

  async function handleClick() {
    setPending(true);
    const result = await toggleFavourite(productId, name);
    setPending(false);
    if (result.ok && refreshOnChange) router.refresh();
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remove ${name} from shopping list` : `Save ${name} to shopping list`}
      disabled={pending}
      onClick={handleClick}
      className={cn(
        "grid place-items-center text-ink hover:bg-surface disabled:opacity-60",
        label ? "btn btn-outline w-full" : "size-10 rounded-full bg-white/90",
        className,
      )}
    >
      <Icon name="heart" filled={active} className="size-5" />
      {/* Visible text must be contained in the accessible name (axe label-content-name-mismatch)
          in BOTH states — session-008 S8-M1 extends the session-007 fix to the pressed state. */}
      {label && <span>{active ? `Remove ${name} from shopping list` : `Save ${name} to shopping list`}</span>}
    </button>
  );
}

export function AddToCartButton({
  productId,
  name,
  quantity = 1,
  variant = "icon",
}: ProductRef & { quantity?: number; variant?: "icon" | "full" }) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await addToCart(productId, name, quantity);
    setPending(false);
  }

  if (variant === "full") {
    return (
      <button type="button" onClick={handleClick} disabled={pending} className="btn btn-primary w-full">
        <Icon name="cart" className="size-5" />
        {pending ? "Adding…" : "Add to shopping cart"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={`Add ${name} to shopping cart`}
      className="grid size-12 place-items-center rounded-full bg-brand text-white hover:bg-brand-hover disabled:bg-line disabled:text-line-strong"
    >
      <Icon name="cart" />
    </button>
  );
}

export function ProductPurchase({ productId, name }: ProductRef) {
  const [quantity, setQuantity] = useState(1);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <span id="qty-label" className="text-sm font-bold">
          Quantity
        </span>
        <div role="group" aria-labelledby="qty-label" className="flex items-center rounded-full border border-line-strong">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="grid size-11 place-items-center rounded-full hover:bg-surface disabled:text-line-strong"
          >
            <Icon name="minus" className="size-4" />
          </button>
          <output aria-live="polite" className="w-8 text-center text-sm font-bold">
            {quantity}
          </output>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={quantity >= MAX_LINE_QUANTITY}
            onClick={() => setQuantity((q) => Math.min(MAX_LINE_QUANTITY, q + 1))}
            className="grid size-11 place-items-center rounded-full hover:bg-surface disabled:text-line-strong"
          >
            <Icon name="plus" className="size-4" />
          </button>
        </div>
      </div>
      <AddToCartButton productId={productId} name={name} quantity={quantity} variant="full" />
      <FavouriteButton productId={productId} name={name} label />
    </div>
  );
}

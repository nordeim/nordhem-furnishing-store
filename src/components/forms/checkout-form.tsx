"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, submitJson, type FieldErrors } from "@/components/forms/field";
import { SmartImage } from "@/components/ui/smart-image";
import { computeTotals, type DeliveryMethod } from "@/lib/cart-math";
import { applyCartCount } from "@/lib/client/shopping-store";
import { formatPrice } from "@/lib/money";
import type { CartLine } from "@/lib/shopping";

export function CheckoutForm({ lines }: { lines: CartLine[] }) {
  const router = useRouter();
  const [method, setMethod] = useState<DeliveryMethod>("delivery");
  const [values, setValues] = useState({ name: "", email: "", phone: "", address: "", postalCode: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const totals = computeTotals(lines, method);
  const bind = (key: keyof typeof values) => ({
    name: key,
    value: values[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setValues((current) => ({ ...current, [key]: event.target.value })),
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setErrors({});
    const outcome = await submitJson<{ orderNo: string }>("/api/checkout", { ...values, method });
    if (outcome.ok && outcome.data) {
      applyCartCount(0);
      router.push(`/orders/${outcome.data.orderNo}`);
      return;
    }
    setSubmitting(false);
    setErrors(outcome.fieldErrors ?? {});
    setFormError(outcome.message ?? null);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-8">
        <fieldset>
          <legend className="mb-3 text-lg font-bold">How would you like to get your order?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              { value: "delivery", title: "Home delivery", note: "Delivered to your door" },
              { value: "click-collect", title: "Click & collect", note: "Free — collect from store" },
            ] as const).map((option) => (
              <label key={option.value} className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${method === option.value ? "border-ink ring-1 ring-ink" : "border-line-strong"}`}>
                <input type="radio" name="method" value={option.value} checked={method === option.value} onChange={() => setMethod(option.value)} className="mt-1 accent-brand" />
                <span>
                  <span className="block text-sm font-bold">{option.title}</span>
                  <span className="block text-xs text-ink-soft">{option.note}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-lg font-bold">Your details</legend>
          <Field id="name" label="Full name" error={errors.name}>
            {(a11y) => <input {...a11y} {...bind("name")} autoComplete="name" required className="field" />}
          </Field>
          <Field id="email" label="Email" error={errors.email}>
            {(a11y) => <input {...a11y} {...bind("email")} type="email" autoComplete="email" required className="field" />}
          </Field>
          <Field id="phone" label="Mobile number" error={errors.phone} hint="e.g. +65 9123 4567">
            {(a11y) => <input {...a11y} {...bind("phone")} type="tel" autoComplete="tel" required className="field" />}
          </Field>
          <Field id="postalCode" label="Postal code" error={errors.postalCode}>
            {(a11y) => <input {...a11y} {...bind("postalCode")} inputMode="numeric" maxLength={6} autoComplete="postal-code" required className="field" />}
          </Field>
          <div className="sm:col-span-2">
            <Field id="address" label={method === "delivery" ? "Delivery address" : "Billing address"} error={errors.address}>
              {(a11y) => <input {...a11y} {...bind("address")} autoComplete="street-address" required className="field" />}
            </Field>
          </div>
        </fieldset>
        <p className="text-xs text-ink-soft">Demo checkout: no payment is taken and no real order is placed.</p>
      </div>

      <aside aria-label="Order summary" className="h-fit rounded-lg bg-surface p-6">
        <h2 className="text-xl font-bold">Order summary</h2>
        <ul className="mt-4 space-y-3">
          {lines.map((line) => (
            <li key={line.productId} className="flex gap-3 text-sm">
              <SmartImage src={line.image} alt="" size="s" className="size-14 shrink-0 object-contain mix-blend-multiply" />
              <span className="flex-1">
                <span className="block font-bold">{line.name}</span>
                <span className="block text-xs text-ink-soft">Qty {line.quantity}</span>
              </span>
              <span className="font-bold">{formatPrice(line.unitPriceCents * line.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatPrice(totals.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{totals.deliveryCents === 0 ? "Free" : formatPrice(totals.deliveryCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
            <dt>Total</dt>
            <dd>{formatPrice(totals.totalCents)}</dd>
          </div>
        </dl>
        {formError && (
          <p role="alert" className="mt-4 rounded bg-negative/10 p-3 text-sm font-bold text-negative">
            {formError}
          </p>
        )}
        <button type="submit" disabled={submitting} className="btn btn-primary mt-5 w-full">
          {submitting ? "Placing order…" : "Place order"}
        </button>
      </aside>
    </form>
  );
}

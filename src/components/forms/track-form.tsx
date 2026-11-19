"use client";

import { useState } from "react";
import { Field, submitJson, type FieldErrors } from "@/components/forms/field";
import { formatPrice } from "@/lib/money";

interface TrackedOrder {
  orderNo: string;
  status: string;
  createdAt: string;
  totalCents: number;
  deliveryMethod: string;
}

export function TrackForm() {
  const [values, setValues] = useState({ orderNo: "", email: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setErrors({});
    setOrder(null);
    const outcome = await submitJson<{ order: TrackedOrder }>("/api/orders/track", values);
    setSubmitting(false);
    if (outcome.ok && outcome.data) {
      setOrder(outcome.data.order);
      return;
    }
    setErrors(outcome.fieldErrors ?? {});
    setFormError(outcome.message ?? null);
  }

  return (
    <div className="max-w-xl">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field id="track-order" label="Order number" error={errors.orderNo} hint="Looks like IKSG-0123456789">
          {(a11y) => <input {...a11y} value={values.orderNo} onChange={(e) => setValues({ ...values, orderNo: e.target.value })} autoComplete="off" required className="field uppercase" />}
        </Field>
        <Field id="track-email" label="Email used at checkout" error={errors.email}>
          {(a11y) => <input {...a11y} type="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} autoComplete="email" required className="field" />}
        </Field>
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? "Looking up…" : "Track order"}
        </button>
      </form>
      <div aria-live="polite" className="mt-6">
        {formError && (
          <p role="alert" className="rounded bg-negative/10 p-3 text-sm font-bold text-negative">
            {formError}
          </p>
        )}
        {order && (
          <dl className="space-y-2 rounded-lg bg-surface p-5 text-sm">
            <div className="flex justify-between">
              <dt>Order</dt>
              <dd className="font-bold">{order.orderNo}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Status</dt>
              <dd className="font-bold capitalize">{order.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Placed</dt>
              <dd>{new Date(order.createdAt).toLocaleDateString("en-SG", { dateStyle: "medium" })}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Method</dt>
              <dd>{order.deliveryMethod === "delivery" ? "Home delivery" : "Click & collect"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Total</dt>
              <dd className="font-bold">{formatPrice(order.totalCents)}</dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}

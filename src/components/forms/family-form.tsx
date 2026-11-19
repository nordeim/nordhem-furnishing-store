"use client";

import { useState } from "react";
import { Field, submitJson, type FieldErrors } from "@/components/forms/field";

export function FamilyForm() {
  const [values, setValues] = useState({ name: "", email: "", marketingConsent: false });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setErrors({});
    const outcome = await submitJson("/api/family", values);
    setSubmitting(false);
    if (outcome.ok) {
      setDone(true);
      return;
    }
    setErrors(outcome.fieldErrors ?? {});
    setFormError(outcome.message ?? null);
  }

  if (done) {
    return (
      <div role="status" className="rounded-lg bg-surface p-6">
        <h2 className="text-xl font-bold">Välkommen, {values.name.split(" ")[0]}!</h2>
        <p className="mt-2 text-sm text-ink-soft">You’re on the IKEA Family list. Watch your inbox for member offers.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field id="family-name" label="Full name" error={errors.name}>
        {(a11y) => <input {...a11y} value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} autoComplete="name" required className="field" />}
      </Field>
      <Field id="family-email" label="Email" error={errors.email}>
        {(a11y) => <input {...a11y} type="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} autoComplete="email" required className="field" />}
      </Field>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={values.marketingConsent} onChange={(e) => setValues({ ...values, marketingConsent: e.target.checked })} className="mt-1 size-4 accent-brand" />
        <span>Email me IKEA Family offers and inspiration. You can unsubscribe at any time.</span>
      </label>
      {formError && (
        <p role="alert" className="rounded bg-negative/10 p-3 text-sm font-bold text-negative">
          {formError}
        </p>
      )}
      <button type="submit" disabled={submitting} className="btn btn-primary">
        {submitting ? "Joining…" : "Join IKEA Family"}
      </button>
    </form>
  );
}

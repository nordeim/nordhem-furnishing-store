import type { ReactNode } from "react";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby": string | undefined }) => ReactNode;
}

export function Field({ id, label, error, hint, children }: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-bold">
        {label}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-bold text-negative">
          {error}
        </p>
      )}
    </div>
  );
}

export type FieldErrors = Partial<Record<string, string>>;

/** Flattens the API's `{ field: string[] }` details into the first message per field. */
export function toFieldErrors(details: unknown): FieldErrors {
  if (typeof details !== "object" || details === null) return {};
  const result: FieldErrors = {};
  for (const [key, value] of Object.entries(details)) {
    if (Array.isArray(value) && typeof value[0] === "string") result[key] = value[0];
  }
  return result;
}

export interface SubmitOutcome<T> {
  ok: boolean;
  data?: T;
  message?: string;
  fieldErrors?: FieldErrors;
}

/** POST JSON and normalise success / validation / network failures for form components. */
export async function submitJson<T>(url: string, body: unknown): Promise<SubmitOutcome<T>> {
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload: unknown = await response.json().catch(() => null);
    if (response.ok) return { ok: true, data: payload as T };
    const error = (payload as { error?: { message?: string; details?: unknown } } | null)?.error;
    return { ok: false, message: error?.message ?? "Something went wrong. Please try again.", fieldErrors: toFieldErrors(error?.details) };
  } catch {
    return { ok: false, message: "Network error. Check your connection and try again." };
  }
}

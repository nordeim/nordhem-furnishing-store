import type { z } from "zod";
import type { RateLimitResult } from "@/lib/rate-limit";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export function json(data: unknown, status = 200, headers?: Record<string, string>): Response {
  return Response.json(data, { status, headers: { ...NO_STORE, ...headers } });
}

export function apiError(status: number, code: string, message: string, details?: unknown): Response {
  return json({ error: { code, message, details } }, status);
}

export function rateLimited(result: RateLimitResult): Response {
  return json(
    { error: { code: "rate_limited", message: "Too many requests. Please try again shortly." } },
    429,
    { "Retry-After": String(Math.max(1, Math.ceil(result.retryAfterMs / 1000))) },
  );
}

/**
 * CSRF guard for cookie-authenticated mutations. Browsers always send `Origin` on cross-site POSTs,
 * so a mismatch is rejected; requests without `Origin` (curl, server-to-server) are allowed because
 * they cannot ride a victim's cookies.
 */
export function hasForeignOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

type ParsedBody<T> = { ok: true; data: T } | { ok: false; response: Response };

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<ParsedBody<T>> {
  if (hasForeignOrigin(request)) {
    return { ok: false, response: apiError(403, "forbidden_origin", "Cross-origin requests are not allowed.") };
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return { ok: false, response: apiError(400, "invalid_json", "Request body must be valid JSON.") };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      response: apiError(422, "validation_failed", "Some fields are invalid.", parsed.error.flatten().fieldErrors),
    };
  }
  return { ok: true, data: parsed.data };
}

export function logEvent(event: string, fields: Record<string, string | number | boolean | null> = {}): void {
  console.info(JSON.stringify({ event, ...fields }));
}

export function logError(event: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ event, message }));
}

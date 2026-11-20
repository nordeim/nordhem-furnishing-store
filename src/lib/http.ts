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

/**
 * Rate-limit key. Proxies APPEND to `x-forwarded-for`, so the FIRST entry is client-spoofable;
 * we count `proxyDepth` hops from the END (default 1 = one trusted proxy). When the header has
 * fewer hops than the declared depth we fail closed to "unknown" (all such clients share one
 * bucket) rather than trusting an attacker-controlled entry. Pinned by tests/unit/http.test.ts.
 */
export function clientKey(request: Request, options?: { proxyDepth?: number }): string {
  const depth = options?.proxyDepth ?? trustedProxyDepth();
  const forwarded = request.headers.get("x-forwarded-for");
  // depth 0 = NO trusted proxy: every x-forwarded-for value is client-authored and ignored.
  if (forwarded && depth >= 1) {
    const hops = forwarded.split(",").map((hop) => hop.trim()).filter(Boolean);
    if (hops.length >= depth) return hops[hops.length - depth];
  }
  return request.headers.get("x-real-ip") || "unknown";
}

/** Unset/garbage → 1 (one trusted proxy); explicit "0" → direct exposure (XFF untrusted). */
function trustedProxyDepth(): number {
  const raw = process.env.TRUSTED_PROXY_DEPTH;
  if (raw === undefined || raw === "") return 1;
  const parsed = Number(raw);
  if (parsed === 0) return 0;
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

/**
 * Bodies larger than this are rejected before parsing — all API schemas are tiny. The read-path
 * check counts UTF-16 code units (JS string length), so the true byte ceiling is up to ~2× for
 * astral-plane input; every real schema is small ASCII, which is what the cap is sized for.
 */
const MAX_JSON_BYTES = 16 * 1024;

type ParsedBody<T> = { ok: true; data: T } | { ok: false; response: Response };

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<ParsedBody<T>> {
  if (hasForeignOrigin(request)) {
    return { ok: false, response: apiError(403, "forbidden_origin", "Cross-origin requests are not allowed.") };
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return { ok: false, response: apiError(415, "unsupported_media_type", "Requests must be JSON.") };
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BYTES) {
    return { ok: false, response: apiError(413, "payload_too_large", "Request body is too large.") };
  }
  let payload: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_JSON_BYTES) {
      return { ok: false, response: apiError(413, "payload_too_large", "Request body is too large.") };
    }
    payload = JSON.parse(text);
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

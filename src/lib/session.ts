import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";

export const SESSION_COOKIE = "ikea_sid";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Read-only lookup, safe in Server Components. Returns undefined for absent or malformed cookies. */
export async function getSessionId(): Promise<string | undefined> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value && UUID_PATTERN.test(value) ? value : undefined;
}

/** Route Handlers / Server Actions only: creates and persists a session cookie when missing. */
export async function ensureSessionId(): Promise<string> {
  const existing = await getSessionId();
  if (existing) return existing;

  const sessionId = randomUUID();
  const forwardedProto = (await headers()).get("x-forwarded-proto");
  (await cookies()).set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: forwardedProto === "https",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return sessionId;
}

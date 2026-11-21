import { clientKey, json, rateLimited } from "@/lib/http";
import { createRateLimiter } from "@/lib/rate-limit";
import { guard } from "@/lib/route";
import { getSessionId } from "@/lib/session";
import { getSummary } from "@/lib/shopping";

export const dynamic = "force-dynamic";

// Session-012 S12-L1: summary is NOT a probe — each call runs two indexed queries
// (cart sum + favourites) keyed on a client-supplied cookie, so it gets the same
// 120/min throttle the cart endpoints have. /api/health (a select-1 probe) stays
// unlimited for orchestrators.
const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 });

export function GET(request: Request) {
  return guard("api.summary", async () => {
    const limit = limiter.check(clientKey(request));
    if (!limit.ok) return rateLimited(limit);
    return json(await getSummary(await getSessionId()));
  });
}

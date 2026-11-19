import { getSuggestions } from "@/lib/catalog";
import { clientKey, json, rateLimited } from "@/lib/http";
import { normaliseQuery } from "@/lib/paths";
import { createRateLimiter } from "@/lib/rate-limit";
import { guard } from "@/lib/route";

export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 90, windowMs: 60_000 });
const MIN_QUERY_LENGTH = 2;

export function GET(request: Request) {
  return guard("api.search", async () => {
    const limit = limiter.check(clientKey(request));
    if (!limit.ok) return rateLimited(limit);

    const q = normaliseQuery(new URL(request.url).searchParams.get("q"));
    if (q.length < MIN_QUERY_LENGTH) return json({ products: [], categories: [] });
    return json(await getSuggestions(q));
  });
}

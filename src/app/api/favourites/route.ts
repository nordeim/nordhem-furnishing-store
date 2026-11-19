import { apiError, clientKey, json, rateLimited, readJson } from "@/lib/http";
import { createRateLimiter } from "@/lib/rate-limit";
import { guard } from "@/lib/route";
import { ensureSessionId } from "@/lib/session";
import { addFavourite, getSummary, removeFavourite } from "@/lib/shopping";
import { favouriteSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 });

export function POST(request: Request) {
  return guard("api.favourites.add", async () => {
    const limit = limiter.check(clientKey(request));
    if (!limit.ok) return rateLimited(limit);

    const body = await readJson(request, favouriteSchema);
    if (!body.ok) return body.response;

    const sessionId = await ensureSessionId();
    const added = await addFavourite(sessionId, body.data.productId);
    if (!added) return apiError(404, "product_not_found", "That product no longer exists.");
    return json(await getSummary(sessionId), 201);
  });
}

export function DELETE(request: Request) {
  return guard("api.favourites.remove", async () => {
    const limit = limiter.check(clientKey(request));
    if (!limit.ok) return rateLimited(limit);

    const body = await readJson(request, favouriteSchema);
    if (!body.ok) return body.response;

    const sessionId = await ensureSessionId();
    await removeFavourite(sessionId, body.data.productId);
    return json(await getSummary(sessionId));
  });
}

import { apiError, clientKey, json, rateLimited, readJson } from "@/lib/http";
import { createRateLimiter } from "@/lib/rate-limit";
import { guard } from "@/lib/route";
import { trackOrder } from "@/lib/shopping";
import { trackOrderSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

export function POST(request: Request) {
  return guard("api.orders.track", async () => {
    const limit = limiter.check(clientKey(request));
    if (!limit.ok) return rateLimited(limit);

    const body = await readJson(request, trackOrderSchema);
    if (!body.ok) return body.response;

    const order = await trackOrder(body.data.orderNo, body.data.email);
    // One message for "no such order" and "wrong email" prevents order-number probing.
    if (!order) return apiError(404, "order_not_found", "We couldn't find an order matching those details.");
    return json({ order });
  });
}

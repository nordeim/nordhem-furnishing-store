import { apiError, clientKey, json, logEvent, rateLimited, readJson } from "@/lib/http";
import { createRateLimiter } from "@/lib/rate-limit";
import { guard } from "@/lib/route";
import { ensureSessionId } from "@/lib/session";
import { placeOrder } from "@/lib/shopping";
import { checkoutSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

export function POST(request: Request) {
  return guard("api.checkout", async () => {
    const limit = limiter.check(clientKey(request));
    if (!limit.ok) return rateLimited(limit);

    const body = await readJson(request, checkoutSchema);
    if (!body.ok) return body.response;

    const sessionId = await ensureSessionId();
    const result = await placeOrder(sessionId, body.data);
    if (!result.ok) return apiError(409, "empty_cart", "Your shopping cart is empty.");

    // Order number only: never log name, email, phone or address.
    logEvent("order.placed", { orderNo: result.orderNo });
    return json({ orderNo: result.orderNo }, 201);
  });
}

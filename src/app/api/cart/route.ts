import { apiError, clientKey, json, rateLimited, readJson } from "@/lib/http";
import { createRateLimiter } from "@/lib/rate-limit";
import { guard } from "@/lib/route";
import { ensureSessionId, getSessionId } from "@/lib/session";
import { addToCart, getCartSnapshot, removeFromCart, setCartQuantity } from "@/lib/shopping";
import { cartAddSchema, cartRemoveSchema, cartSetSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 });

// Session-011 S11-L2: GET is now limited too — it is an unauthenticated, DB-touching
// read (the DEPLOYMENT rate-limit table has always documented 120/min for it; the code
// previously only limited the mutations, leaving an unthrottled read surface).
export function GET(request: Request) {
  return guard("api.cart.get", async () => {
    const limit = limiter.check(clientKey(request));
    if (!limit.ok) return rateLimited(limit);
    return json(await getCartSnapshot(await getSessionId()));
  });
}

export function POST(request: Request) {
  return guard("api.cart.add", async () => {
    const limit = limiter.check(clientKey(request));
    if (!limit.ok) return rateLimited(limit);

    const body = await readJson(request, cartAddSchema);
    if (!body.ok) return body.response;

    const sessionId = await ensureSessionId();
    const added = await addToCart(sessionId, body.data.productId, body.data.quantity);
    if (!added) return apiError(404, "product_not_found", "That product no longer exists.");
    return json(await getCartSnapshot(sessionId), 201);
  });
}

export function PATCH(request: Request) {
  return guard("api.cart.set", async () => {
    const limit = limiter.check(clientKey(request));
    if (!limit.ok) return rateLimited(limit);

    const body = await readJson(request, cartSetSchema);
    if (!body.ok) return body.response;

    const sessionId = await ensureSessionId();
    const updated = await setCartQuantity(sessionId, body.data.productId, body.data.quantity);
    if (!updated) return apiError(404, "line_not_found", "That item is not in your cart.");
    return json(await getCartSnapshot(sessionId));
  });
}

export function DELETE(request: Request) {
  return guard("api.cart.remove", async () => {
    const limit = limiter.check(clientKey(request));
    if (!limit.ok) return rateLimited(limit);

    const body = await readJson(request, cartRemoveSchema);
    if (!body.ok) return body.response;

    const sessionId = await ensureSessionId();
    await removeFromCart(sessionId, body.data.productId);
    return json(await getCartSnapshot(sessionId));
  });
}

import { clientKey, json, logEvent, rateLimited, readJson } from "@/lib/http";
import { createRateLimiter } from "@/lib/rate-limit";
import { guard } from "@/lib/route";
import { joinFamily } from "@/lib/shopping";
import { familySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

export function POST(request: Request) {
  return guard("api.family", async () => {
    const limit = limiter.check(clientKey(request));
    if (!limit.ok) return rateLimited(limit);

    const body = await readJson(request, familySchema);
    if (!body.ok) return body.response;

    await joinFamily(body.data);
    logEvent("family.joined", { consent: body.data.marketingConsent });
    // Identical response for new and existing emails so the endpoint cannot be used to enumerate members.
    return json({ ok: true }, 201);
  });
}

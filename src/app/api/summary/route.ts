import { json } from "@/lib/http";
import { guard } from "@/lib/route";
import { getSessionId } from "@/lib/session";
import { getSummary } from "@/lib/shopping";

export const dynamic = "force-dynamic";

export function GET() {
  return guard("api.summary", async () => json(await getSummary(await getSessionId())));
}

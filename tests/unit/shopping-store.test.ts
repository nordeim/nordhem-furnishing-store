import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ShoppingState } from "@/lib/client/shopping-store";

/**
 * The store is a module singleton — import it fresh per test so module state
 * (summaryLoaded, in-flight guard) never leaks between cases.
 */
async function freshStore() {
  const mod = await import("@/lib/client/shopping-store");
  return mod;
}

/** useShopping is a React hook (no dispatcher outside render) — use the exported snapshot seam. */
function readState(store: Awaited<ReturnType<typeof freshStore>>): ShoppingState {
  return store.getShoppingSnapshot();
}



describe("ensureSummaryLoaded in-flight guard", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fires exactly ONE /api/summary request for many concurrent callers", async () => {
    const fetchMock = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(new Response(JSON.stringify({ cartCount: 2, favouriteIds: [7] }), { headers: { "content-type": "application/json" } })), 20)),
    );
    vi.stubGlobal("fetch", fetchMock);
    const store = await freshStore();

    // 25 concurrent mount effects (a listing page's worth of FavouriteButtons + header)
    for (let i = 0; i < 25; i++) store.ensureSummaryLoaded();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 40));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(readState(store).cartCount).toBe(2);
  });

  it("retries on the NEXT call after a failure (flag not frozen)", async () => {
    let calls = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      calls += 1;
      if (calls === 1) return Promise.resolve(new Response("server error", { status: 500 }));
      return Promise.resolve(new Response(JSON.stringify({ cartCount: 1, favouriteIds: [] }), { headers: { "content-type": "application/json" } }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const store = await freshStore();

    store.ensureSummaryLoaded();
    await new Promise((r) => setTimeout(r, 10));
    expect(calls).toBe(1);

    store.ensureSummaryLoaded(); // must refire — the failure must not look "loaded"
    await vi.waitFor(() => expect(calls).toBe(2));
    await new Promise((r) => setTimeout(r, 10));
    expect(readState(store).cartCount).toBe(1);
  });

  it("does not refire while a request is in flight, and not after success", async () => {
    let calls = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      calls += 1;
      return new Promise((resolve) => setTimeout(() => resolve(new Response(JSON.stringify({ cartCount: 0, favouriteIds: [] }), { headers: { "content-type": "application/json" } })), 20));
    });
    vi.stubGlobal("fetch", fetchMock);
    const store = await freshStore();

    store.ensureSummaryLoaded();
    store.ensureSummaryLoaded(); // in-flight: suppressed
    await new Promise((r) => setTimeout(r, 40));
    store.ensureSummaryLoaded(); // loaded: suppressed
    expect(calls).toBe(1);
  });
});

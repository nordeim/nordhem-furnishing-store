import { describe, expect, it } from "vitest";
import { clientKey, hasForeignOrigin, readJson } from "@/lib/http";
import { z } from "zod";

function request(headers: Record<string, string>, body?: unknown): Request {
  return new Request("http://store.test/api/cart", {
    method: "POST",
    headers: { "content-type": "application/json", host: "store.test", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("clientKey (X-Forwarded-For trust depth)", () => {
  it("uses the LAST hop when a depth is explicitly declared (proxies append; the first entry is client-spoofable)", () => {
    const req = request({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" });
    expect(clientKey(req, { proxyDepth: 1 })).toBe("10.0.0.1");
  });

  it("uses the entry N hops from the end per an explicit proxyDepth", () => {
    const req = request({ "x-forwarded-for": "1.2.3.4, 10.0.0.1, 10.0.0.2" });
    expect(clientKey(req, { proxyDepth: 2 })).toBe("10.0.0.1");
  });

  it("falls back to 'unknown' on direct exposure — x-real-ip is ALSO client-authorable (session-006 H-1)", () => {
    // Live-verified pre-fix: 12/12 rotating spoofed x-real-ip headers bypassed the track
    // limiter on :3100. Only a DECLARED proxy (TRUSTED_PROXY_DEPTH >= 1) may source the key.
    const env = process.env.TRUSTED_PROXY_DEPTH;
    delete process.env.TRUSTED_PROXY_DEPTH;
    try {
      expect(clientKey(request({ "x-real-ip": "9.9.9.9" }))).toBe("unknown");
      expect(clientKey(request({}))).toBe("unknown");
    } finally {
      if (env !== undefined) process.env.TRUSTED_PROXY_DEPTH = env;
    }
  });

  it("honors x-real-ip ONLY when proxy trust is declared (TRUSTED_PROXY_DEPTH >= 1)", () => {
    const env = process.env.TRUSTED_PROXY_DEPTH;
    process.env.TRUSTED_PROXY_DEPTH = "1";
    try {
      // The proxy is trusted to set x-real-ip (or append XFF) — either may key the bucket.
      expect(clientKey(request({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
      expect(clientKey(request({}))).toBe("unknown");
    } finally {
      if (env === undefined) delete process.env.TRUSTED_PROXY_DEPTH;
      else process.env.TRUSTED_PROXY_DEPTH = env;
    }
  });

  it("UNSET env means direct exposure: even a single-hop XFF is client-authored and ignored (session-005 H-1)", () => {
    // Trust must be OPTED INTO via TRUSTED_PROXY_DEPTH >= 1. The old default of 1 let a bare
    // client-sent "x-forwarded-for: 8.8.8.8" mint a fresh rate-limit bucket per request —
    // live-verified on :3100 (12/12 rotating spoofed XFFs bypassed the checkout limiter).
    const env = process.env.TRUSTED_PROXY_DEPTH;
    delete process.env.TRUSTED_PROXY_DEPTH;
    try {
      expect(clientKey(request({ "x-forwarded-for": "1.2.3.4" }))).toBe("unknown");
      expect(clientKey(request({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("unknown");
    } finally {
      if (env !== undefined) process.env.TRUSTED_PROXY_DEPTH = env;
    }
  });

  it("fails closed when the declared depth exceeds the available hops", () => {
    const req = request({ "x-forwarded-for": "1.2.3.4" });
    expect(clientKey(req, { proxyDepth: 3 })).toBe("unknown");
  });

  it("honors TRUSTED_PROXY_DEPTH=0 as 'no trusted proxy — ignore x-forwarded-for entirely'", () => {
    const env = process.env.TRUSTED_PROXY_DEPTH;
    process.env.TRUSTED_PROXY_DEPTH = "0";
    try {
      // Even a multi-hop XFF is attacker-authored on direct exposure — must not key the bucket.
      expect(clientKey(request({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).not.toBe("10.0.0.1");
      expect(clientKey(request({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("unknown");
      expect(clientKey(request({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "9.9.9.9" }))).toBe("unknown");
    } finally {
      if (env === undefined) delete process.env.TRUSTED_PROXY_DEPTH;
      else process.env.TRUSTED_PROXY_DEPTH = env;
    }
  });

  it("explicit proxyDepth=0 (option form) also ignores XFF; garbage env fails CLOSED (session-005)", () => {
    expect(clientKey(request({ "x-forwarded-for": "1.2.3.4" }), { proxyDepth: 0 })).toBe("unknown");
    const env = process.env.TRUSTED_PROXY_DEPTH;
    process.env.TRUSTED_PROXY_DEPTH = "garbage";
    try {
      // Unparsable values must not silently re-enable proxy trust.
      expect(clientKey(request({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("unknown");
    } finally {
      if (env === undefined) delete process.env.TRUSTED_PROXY_DEPTH;
      else process.env.TRUSTED_PROXY_DEPTH = env;
    }
  });
});

describe("hasForeignOrigin (CSRF guard)", () => {
  it("allows same-origin and missing Origin (non-browser clients cannot ride cookies)", () => {
    expect(hasForeignOrigin(request({ origin: "http://store.test" }))).toBe(false);
    expect(hasForeignOrigin(request({}))).toBe(false);
  });

  it("rejects mismatched origins, honoring x-forwarded-host", () => {
    expect(hasForeignOrigin(request({ origin: "https://evil.example" }))).toBe(true);
    expect(
      hasForeignOrigin(request({ origin: "https://evil.example", "x-forwarded-host": "evil.example" })),
    ).toBe(false);
  });

  it("rejects unparseable origins", () => {
    expect(hasForeignOrigin(request({ origin: "not a url" }))).toBe(true);
  });
});

describe("readJson (body gates)", () => {
  const schema = z.object({ productId: z.number().int() });

  it("rejects non-JSON Content-Type before parsing", async () => {
    const req = request({ "content-type": "text/plain" }, { productId: 1 });
    const result = await readJson(req, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(415);
  });

  it("rejects bodies over the size ceiling without parsing them", async () => {
    const big = "x".repeat(20 * 1024);
    const req = request({}, { productId: 1, junk: big });
    const result = await readJson(req, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });

  it("still rejects foreign origins with 403 and invalid payloads with 422", async () => {
    const csrf = await readJson(request({ origin: "https://evil.example" }, { productId: 1 }), schema);
    expect(csrf.ok).toBe(false);
    if (!csrf.ok) expect(csrf.response.status).toBe(403);

    const invalid = await readJson(request({}, { productId: "x" }), schema);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.response.status).toBe(422);
  });

  it("parses a valid body", async () => {
    const result = await readJson(request({}, { productId: 7 }), schema);
    expect(result).toEqual({ ok: true, data: { productId: 7 } });
  });
});

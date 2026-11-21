import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSecurityHeaders } from "@/lib/security-headers";

/**
 * Session-009 S9-H1: the session-007 CSP is served identically in `next dev`, where React's
 * development runtime REQUIRES eval() (callstack reconstruction) — hydration dies and every
 * client island is inert (live-verified: the mobile drawer never mounted on :3000 while the
 * same build worked on :3100). The production policy stays byte-identical; only the dev
 * server gains 'unsafe-eval'. HSTS joins the set (homenest parity; the one residual header
 * missing from the register).
 */
describe("buildSecurityHeaders (session-009 S9-H1 + HSTS)", () => {
  const production = buildSecurityHeaders("production");
  const development = buildSecurityHeaders("development");

  const csp = (headers: { key: string; value: string }[]) =>
    headers.find((h) => h.key === "Content-Security-Policy")?.value ?? "";

  it("production script-src stays strict (no unsafe-eval)", () => {
    expect(csp(production)).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp(production)).not.toContain("unsafe-eval");
  });

  it("development script-src allows unsafe-eval so React's dev runtime hydrates", () => {
    expect(csp(development)).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
  });

  it("the CSP allowlist is otherwise unchanged in both modes", () => {
    for (const headers of [production, development]) {
      const policy = csp(headers);
      expect(policy).toContain("default-src 'self'");
      expect(policy).toContain("img-src 'self' https://www.ikea.com");
      expect(policy).toContain("style-src 'self' 'unsafe-inline'");
      expect(policy).toContain("object-src 'none'");
      expect(policy).toContain("base-uri 'self'");
      expect(policy).toContain("form-action 'self'");
      expect(policy).toContain("frame-ancestors 'none'");
      // Session-008 S8-I1: the unused data: allowance stays dropped.
      expect(policy).not.toContain("data:");
    }
  });

  it("carries the baseline security headers in both modes", () => {
    for (const headers of [production, development]) {
      const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));
      expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
      expect(byKey["X-Frame-Options"]).toBe("DENY");
      expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
      expect(byKey["Permissions-Policy"]).toContain("camera=()");
    }
  });

  it("HSTS is present in both modes (ignored over plain-HTTP dev by spec)", () => {
    for (const headers of [production, development]) {
      const hsts = headers.find((h) => h.key === "Strict-Transport-Security");
      expect(hsts).toBeDefined();
      expect(hsts!.value).toContain("max-age=31536000");
      expect(hsts!.value).toContain("includeSubDomains");
    }
  });

  it("next.config.ts consumes the seam (no inline header list drifts back)", () => {
    const config = readFileSync("next.config.ts", "utf8");
    expect(config).toContain('from "./src/lib/security-headers"');
  });

  it("next.config.ts allows the 127.0.0.1 dev origin (the hydration half of S9-H1)", () => {
    // Next 16 blocks cross-origin dev-resource requests by default; browsing the dev
    // server via the loopback IP (instead of localhost) 403'd them and React never
    // hydrated. The pin keeps the allowedDevOrigins declaration from being dropped.
    const config = readFileSync("next.config.ts", "utf8");
    const m = config.match(/allowedDevOrigins:\s*\[([^\]]*)\]/);
    expect(m, "allowedDevOrigins declaration").not.toBeNull();
    expect(m![1]).toContain('"127.0.0.1"');
  });
});

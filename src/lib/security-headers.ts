/**
 * Session-009 S9-H1: the security-header set, built per NODE_ENV.
 *
 * Two dev-server defects surfaced while live-verifying `npm run dev` this session:
 *  1. The session-007 CSP shipped identical in `next dev`, where React's development
 *     runtime wants eval() for callstack reconstruction — it logged "eval() is not
 *     supported" on every load. The dev server now opts into 'unsafe-eval' for
 *     script-src (React's own recommendation); React never uses eval in production, so
 *     the production policy stays byte-identical to the session-007/008 one.
 *  2. Hydration itself died only when the dev server was addressed as 127.0.0.1 —
 *     Next 16 blocks cross-origin dev-resource requests by default. That half lives in
 *     next.config.ts (`allowedDevOrigins`), not here.
 *
 * HSTS (homenest parity, session-009 do-now): max-age one year + subdomains. Browsers
 * ignore the header over plain HTTP, so the dev server is unaffected by spec.
 */
export interface SecurityHeader {
  key: string;
  value: string;
}

export function buildSecurityHeaders(nodeEnv: string | undefined): SecurityHeader[] {
  const isDev = nodeEnv === "development";
  const scriptSrc = isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'";
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    {
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    },
    {
      key: "Content-Security-Policy",
      value: `default-src 'self'; img-src 'self' https://www.ikea.com; style-src 'self' 'unsafe-inline'; ${scriptSrc}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
    },
  ];
}

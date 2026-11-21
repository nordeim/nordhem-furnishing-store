import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/lib/security-headers";

// Session-009 S9-H1: headers come from the tested seam (src/lib/security-headers.ts) —
// dev gains script-src 'unsafe-eval' (React's dev runtime needs eval; shipping the strict
// production CSP in `next dev` killed hydration and every client island), production stays
// byte-identical to the session-007/008 policy. HSTS joined the set this session.
const securityHeaders = buildSecurityHeaders(process.env.NODE_ENV);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Session-009 S9-H1 (the hydration half): Next 16 blocks cross-origin requests to dev
  // resources by default — browsing `npm run dev` via 127.0.0.1 (vs localhost) 403'd the
  // dev-resource requests and React never hydrated (live-verified: zero fiber keys, every
  // client island inert). Declaring the loopback IP as an allowed dev origin fixes the
  // loopback access path; production is unaffected (dev-only config).
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/profile", destination: "/ikea-family", permanent: false },
      { source: "/customer-service/track-manage-order", destination: "/track-order", permanent: false },
      { source: "/ikea-family/:path+", destination: "/ikea-family", permanent: false },
    ];
  },
};

export default nextConfig;

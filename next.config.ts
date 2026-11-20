import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Session-007 CSP, tightened session-008 S8-I1 (the data: allowance was unused — every
  // image is self-hosted or on the IKEA CDN; the SmartImage fallback is a plain <div>):
  // no inline event handlers exist; inline content is limited to the two JSON-LD blocks,
  // Next's RSC bootstrap pushes and a handful of style attributes — hence 'unsafe-inline'
  // for style, and 'unsafe-inline' for script only because the RSC bootstrap uses inline
  // pushes (nonce middleware is the later tightening step).
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; img-src 'self' https://www.ikea.com; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
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

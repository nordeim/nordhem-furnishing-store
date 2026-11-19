import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
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

import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { unoptimized: true },
  // Ancienne adresse du quiz (liens déjà partagés).
  async redirects() {
    return [{ source: "/quiz-constantes", destination: "/quiz/constantes", permanent: true }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

// Rend les bindings Cloudflare (R2, secrets…) disponibles pendant `next dev`.
initOpenNextCloudflareForDev();

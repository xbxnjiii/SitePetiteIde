import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Préprod : variable NEXT_PUBLIC_SITE_ENV=preprod, ou détection automatique de la branche Git « preprod »
// pendant le build Cloudflare (WORKERS_CI_BRANCH est fourni par Workers Builds).
const siteEnv = process.env.NEXT_PUBLIC_SITE_ENV || (process.env.WORKERS_CI_BRANCH === "preprod" ? "preprod" : "");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_SITE_ENV: siteEnv },
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

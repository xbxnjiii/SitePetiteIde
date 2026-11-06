import type { MetadataRoute } from "next";
import { SITE } from "@/lib/format";

// Phase 2 (démo) : indexation bloquée. À ouvrir au lancement (phase 5).
const IS_LIVE = false;

export default function robots(): MetadataRoute.Robots {
  return IS_LIVE
    ? { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/panier", "/commande"] }], sitemap: `${SITE.url}/sitemap.xml` }
    : { rules: [{ userAgent: "*", disallow: "/" }] };
}

import type { MetadataRoute } from "next";
import { IS_LIVE, SITE } from "@/lib/format";

export default function robots(): MetadataRoute.Robots {
  return IS_LIVE
    ? { rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/merci", "/telecharger"] }], sitemap: `${SITE.url}/sitemap.xml` }
    : { rules: [{ userAgent: "*", disallow: "/" }] };
}

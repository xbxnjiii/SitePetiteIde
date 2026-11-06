import type { MetadataRoute } from "next";
import { publishedPacks } from "@/content/packs";
import { SITE } from "@/lib/format";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/faq", "/contact", "/mentions-legales", "/cgv", "/confidentialite", "/retrouver-mon-achat", "/quiz", "/quiz/constantes"];
  return [...pages, ...publishedPacks().map((p) => `/${p.slug}`)].map((p) => ({ url: `${SITE.url}${p}` }));
}

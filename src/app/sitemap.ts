import { quizzes } from "@/content/quiz";
import type { MetadataRoute } from "next";
import { publishedPacks } from "@/content/packs";
import { SITE } from "@/lib/format";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/faq", "/contact", "/mentions-legales", "/cgv", "/confidentialite", "/retrouver-mon-achat", "/quiz", ...quizzes.filter((q) => q.status === "available").map((q) => `/quiz/${q.slug}`), "/packs"];
  return [...pages, ...publishedPacks().map((p) => `/${p.slug}`)].map((p) => ({ url: `${SITE.url}${p}` }));
}

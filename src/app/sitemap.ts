import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/catalog";
import { SITE } from "@/lib/format";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const pages = ["", "/boutique", "/packs", "/a-propos", "/faq", "/contact", "/mentions-legales", "/cgv", "/confidentialite"];
  return [
    ...pages.map((p) => ({ url: `${SITE.url}${p}` })),
    ...categories.map((c) => ({ url: `${SITE.url}/categorie/${c.slug}` })),
    ...products.map((p) => ({ url: `${SITE.url}/produit/${p.slug}`, lastModified: p.publishedAt })),
  ];
}

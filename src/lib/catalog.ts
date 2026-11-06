// Couche d'accès au catalogue.
// Phase 2 : lit les données fictives. Phase 3 : ces mêmes fonctions interrogeront
// Supabase. Les pages et composants ne dépendent que de ces signatures.
import { categories, products } from "./mock-data";
import type { Category, Product, ProductQuery, SortOption } from "./types";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "populaires", label: "Populaires" },
  { value: "nouveautes", label: "Nouveautés" },
  { value: "prix-asc", label: "Prix croissant" },
  { value: "prix-desc", label: "Prix décroissant" },
];

export function isSortOption(v: unknown): v is SortOption {
  return SORT_OPTIONS.some((o) => o.value === v);
}

export async function getCategories(): Promise<Category[]> {
  return [...categories].sort((a, b) => a.position - b.position);
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  return categories.find((c) => c.slug === slug);
}

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  let list = [...products];
  if (query.category) list = list.filter((p) => p.categorySlug === query.category);
  if (query.type) list = list.filter((p) => p.type === query.type);
  if (query.q) {
    const terms = normalize(query.q).split(/\s+/).filter(Boolean);
    list = list.filter((p) => {
      const haystack = normalize(`${p.name} ${p.shortDescription}`);
      return terms.every((t) => haystack.includes(t));
    });
  }
  const sort = query.sort ?? "populaires";
  list.sort((a, b) => {
    switch (sort) {
      case "nouveautes":
        return b.publishedAt.localeCompare(a.publishedAt);
      case "prix-asc":
        return a.priceCents - b.priceCents;
      case "prix-desc":
        return b.priceCents - a.priceCents;
      default:
        return b.salesCount - a.salesCount;
    }
  });
  return list;
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  const list = await getProducts({ sort: "populaires" });
  return list.filter((p) => p.isFeatured && p.type === "single").slice(0, limit);
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  return products.find((p) => p.slug === slug);
}

export async function getPackItems(pack: Product): Promise<Product[]> {
  if (!pack.packItems) return [];
  return pack.packItems
    .map((slug) => products.find((p) => p.slug === slug))
    .filter((p): p is Product => Boolean(p));
}

/** « Vous pourriez aussi aimer » : même catégorie d'abord, puis les plus populaires. */
export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const others = (await getProducts({ sort: "populaires" })).filter((p) => p.id !== product.id);
  const same = others.filter((p) => p.categorySlug === product.categorySlug);
  const rest = others.filter((p) => p.categorySlug !== product.categorySlug);
  return [...same, ...rest].slice(0, limit);
}

/** Packs contenant ce produit (pour suggérer une offre plus avantageuse). */
export async function getPacksContaining(product: Product): Promise<Product[]> {
  return products.filter((p) => p.type === "pack" && p.packItems?.includes(product.slug));
}

export async function countProductsByCategory(): Promise<Record<string, number>> {
  return products.reduce<Record<string, number>>((acc, p) => {
    acc[p.categorySlug] = (acc[p.categorySlug] ?? 0) + 1;
    return acc;
  }, {});
}

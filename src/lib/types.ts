// Types du catalogue. Ils reprennent le schéma SQL (docs/ARCHITECTURE.md §3)
// pour que le passage aux données Supabase (phase 3) ne change pas les composants.

export type ProductType = "single" | "pack";
export type IconName =
  | "book"
  | "clipboard"
  | "syringe"
  | "note"
  | "toolbox"
  | "layers"
  | "heart"
  | "lungs"
  | "thermo"
  | "drop"
  | "pill"
  | "gauge";
export type Tone = "blue" | "sky" | "pink";

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: IconName;
  tone: Tone;
  position: number;
}

export interface Product {
  id: string;
  slug: string;
  type: ProductType;
  categorySlug: string;
  name: string;
  shortDescription: string;
  description: string;
  learningObjectives: string[];
  contents: string[];
  pageCount: number;
  priceCents: number;
  compareAtPriceCents?: number;
  isFeatured: boolean;
  publishedAt: string; // ISO
  icon: IconName;
  tone: Tone;
  /** Pour un pack : slugs des produits inclus. */
  packItems?: string[];
  /** Nombre de ventes (fictif en phase 2, calculé depuis les commandes en phase 3). */
  salesCount: number;
}

export type SortOption = "populaires" | "nouveautes" | "prix-asc" | "prix-desc";

export interface ProductQuery {
  q?: string;
  category?: string;
  sort?: SortOption;
  type?: ProductType;
}

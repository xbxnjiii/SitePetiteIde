import { getCategories } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";

export async function ProductGrid({ products }: { products: Product[] }) {
  const categories = await getCategories();
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  return (
    <div className="grid-products">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} category={bySlug.get(p.categorySlug)} />
      ))}
    </div>
  );
}

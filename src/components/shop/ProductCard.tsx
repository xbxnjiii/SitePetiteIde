import Link from "next/link";
import { Price } from "@/components/ui/Price";
import type { Category, Product } from "@/lib/types";
import { ProductCover } from "./ProductCover";

export function ProductCard({ product, category, headingLevel = 3 }: { product: Product; category?: Category; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const isNew = Date.now() - new Date(product.publishedAt).getTime() < 1000 * 60 * 60 * 24 * 21;
  return (
    <article className="card">
      <div className="card__badges">
        {product.type === "pack" ? <span className="badge badge--pink">Pack</span> : null}
        {product.isFeatured && product.type !== "pack" ? <span className="badge">Populaire</span> : null}
        {isNew ? <span className="badge">Nouveau</span> : null}
      </div>
      <ProductCover product={product} />
      <div className="card__body">
        {category ? <span className="card__cat">{category.name}</span> : null}
        <H className="card__title">
          <Link href={`/produit/${product.slug}`}>{product.name}</Link>
        </H>
        <p className="card__desc">{product.shortDescription}</p>
        <div className="card__foot">
          <Price cents={product.priceCents} compareAt={product.compareAtPriceCents} />
          <span className="card__cta" aria-hidden="true">
            Découvrir →
          </span>
        </div>
      </div>
    </article>
  );
}

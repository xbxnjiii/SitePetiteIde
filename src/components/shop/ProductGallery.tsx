"use client";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { ProductCover } from "./ProductCover";

// Galerie : couverture + aperçus de pages.
// Phase 2 : aperçus PROVISOIRES (gabarits). Phase 3 : images importées dans l'admin.
const PREVIEWS = 3;

function PreviewPage({ index }: { index: number }) {
  return (
    <div className="preview-page" aria-hidden="true">
      <div className="preview-page__sheet">
        <i />
        <i />
        <i />
        {index % 2 === 0 ? <b /> : null}
        <i />
        <i />
        <i />
        {index % 2 === 1 ? <b /> : null}
        <i />
      </div>
    </div>
  );
}

export function ProductGallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0);
  const views = ["Couverture", ...Array.from({ length: PREVIEWS }, (_, i) => `Aperçu page ${i + 1}`)];
  return (
    <div className="product__gallery">
      <div role="img" aria-label={`${product.name} — ${views[active]}`}>
        {active === 0 ? <ProductCover product={product} /> : <PreviewPage index={active} />}
      </div>
      <div className="product__thumbs" role="group" aria-label="Choisir un aperçu">
        {views.map((label, i) => (
          <button key={label} type="button" className="product__thumb" aria-pressed={active === i} aria-label={label} onClick={() => setActive(i)}>
            {i === 0 ? <ProductCover product={product} /> : <PreviewPage index={i} />}
          </button>
        ))}
      </div>
      <p className="preview-page__label">Aperçus provisoires — les vraies pages seront ajoutées depuis l&apos;administration.</p>
    </div>
  );
}

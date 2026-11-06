"use client";
import { useState } from "react";
import type { Pack } from "@/content/packs";
import { PackCover } from "./PackCover";

// Couverture + aperçus de pages. Aperçus PROVISOIRES (gabarits) en attendant les vraies pages.
const PREVIEWS = 3;

function PreviewPage({ index }: { index: number }) {
  return (
    <div className="preview-page" aria-hidden="true">
      <div className="preview-page__sheet">
        <i /><i /><i />
        {index % 2 === 0 ? <b /> : null}
        <i /><i /><i />
        {index % 2 === 1 ? <b /> : null}
        <i />
      </div>
    </div>
  );
}

export function PackGallery({ pack }: { pack: Pack }) {
  const [active, setActive] = useState(0);
  const views = ["Couverture", ...Array.from({ length: PREVIEWS }, (_, i) => `Aperçu page ${i + 1}`)];
  return (
    <div className="product__gallery">
      <div role="img" aria-label={`${pack.name} — ${views[active]}`}>
        {active === 0 ? <PackCover icon={pack.icon} tone={pack.tone} /> : <PreviewPage index={active} />}
      </div>
      <div className="product__thumbs" role="group" aria-label="Choisir un aperçu">
        {views.map((label, i) => (
          <button key={label} type="button" className="product__thumb" aria-pressed={active === i} aria-label={label} onClick={() => setActive(i)}>
            {i === 0 ? <PackCover icon={pack.icon} tone={pack.tone} /> : <PreviewPage index={i} />}
          </button>
        ))}
      </div>
    </div>
  );
}

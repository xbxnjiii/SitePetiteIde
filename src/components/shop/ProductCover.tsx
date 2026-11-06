import { Icon } from "@/components/ui/Icon";
import type { Product } from "@/lib/types";

// Visuel de couverture PROVISOIRE, généré en CSS à partir de l'icône et de la
// couleur du produit. Remplacé en phase 3 par l'image importée dans l'admin.
export function ProductCover({ product, className = "" }: { product: Pick<Product, "icon" | "tone" | "type">; className?: string }) {
  return (
    <div className={`cover cover--${product.tone} ${className}`} aria-hidden="true">
      {product.type === "pack" ? <div className="cover__stack" /> : null}
      <div className="cover__sheet">
        <div className="cover__icon">
          <Icon name={product.icon} />
        </div>
        <div className="cover__line cover__line--title" />
        <div className="cover__line" />
        <div className="cover__line cover__line--short" />
        <div className="cover__line" />
      </div>
    </div>
  );
}

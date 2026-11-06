import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/format";

/** Bouton d'achat : simple formulaire POST vers /api/checkout (fonctionne sans JavaScript). */
export function BuyButton({ slug, priceCents, compact = false }: { slug: string; priceCents: number; compact?: boolean }) {
  return (
    <form method="post" action="/api/checkout" className={compact ? "buy-form buy-form--compact" : "buy-form"}>
      <input type="hidden" name="pack" value={slug} />
      <button type="submit" className="btn btn--primary btn--block btn--buy">
        {compact ? null : <Icon name="shield" />} Acheter · {formatPrice(priceCents)}
      </button>
      {compact ? null : (
        <p className="pay-methods">
          <span>Apple Pay</span>
          <span>Google Pay</span>
          <span>Carte bancaire</span>
        </p>
      )}
    </form>
  );
}

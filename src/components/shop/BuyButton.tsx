import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/format";

/** Bouton d'achat : simple formulaire POST vers /api/checkout (fonctionne sans JavaScript). */
export function BuyButton({
  slug,
  priceCents,
  label = "Acheter",
  compact = false,
}: {
  slug: string;
  priceCents: number;
  label?: string;
  compact?: boolean;
}) {
  return (
    <form
      method="post"
      action="/api/checkout"
      className={compact ? "buy-form buy-form--compact" : "buy-form"}
      {...(compact ? {} : { "data-buy-anchor": "" })}
    >
      <input type="hidden" name="pack" value={slug} />
      <button type="submit" className="btn btn--primary btn--block btn--buy">
        {compact ? label : `${label} · ${formatPrice(priceCents)}`}
        {compact ? null : <Icon name="arrow" />}
      </button>
      {compact ? null : (
        <p className="pay-methods" aria-label="Moyens de paiement acceptés">
          <span>Apple Pay</span>
          <span>Google Pay</span>
          <span>Carte bancaire</span>
        </p>
      )}
    </form>
  );
}

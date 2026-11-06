// ============================================================================
//  OFFRE DE LANCEMENT — bandeau + code appliqué automatiquement au paiement.
// ----------------------------------------------------------------------------
//  1. Créer dans Stripe (mode réel) un coupon du même pourcentage et un code
//     promotionnel client identique à `code` (avec la même date de fin).
//  2. Ajuster ci-dessous. L'offre disparaît toute seule après `endsAt`.
//  Prix de référence affiché barré : le prix normal pratiqué avant l'offre.
// ============================================================================
export const OFFER = {
  // ⚠️ true seulement si le code existe dans Stripe (mode réel).
  enabled: true,
  code: "LANCEMENT",
  /** Texte de la réduction (doit correspondre au coupon Stripe). */
  label: "−20 %",
  /** Fin de l'offre (heure de Paris). */
  endsAt: "2026-11-30T23:59:59+01:00",
  endsLabel: "30 novembre",
};

export const isOfferActive = (now = Date.now()) => OFFER.enabled && now < new Date(OFFER.endsAt).getTime();

/** Événement émis quand le code de l'offre a bien été appliqué par Stripe. */
export const OFFER_APPLIED_EVENT = "lpi:offer-applied";

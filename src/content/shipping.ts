// ============================================================================
//  LIVRAISON DES FICHES PAPIER — tarif unique, France métropolitaine.
//  ⚠️ Délais à valider par La Petite IDE.
// ============================================================================

export const SHIPPING = {
  /** Frais de port TTC, quel que soit le nombre de fiches. */
  priceCents: 399,
  /** Nom affiché dans le paiement et dans Stripe. */
  name: "Lettre suivie La Poste",
  /** Délai de préparation annoncé au client. */
  dispatch: "Expédié sous 2 jours ouvrés",
  /** Délai de livraison estimé après expédition (jours ouvrés), affiché par Stripe. */
  estimate: { min: 3, max: 6 },
  zone: "France métropolitaine (Corse comprise)",
  /** Codes postaux refusés : outre-mer (97…, 98…). */
  excludedPostalPrefixes: ["97", "98"],
};

/** Adresse livrable : France métropolitaine uniquement. */
export function isDeliverable(address: { country?: string | null; postal_code?: string | null } | null | undefined): boolean {
  if (!address || address.country !== "FR") return false;
  const cp = (address.postal_code ?? "").replace(/\s/g, "");
  return /^\d{5}$/.test(cp) && !SHIPPING.excludedPostalPrefixes.some((p) => cp.startsWith(p));
}

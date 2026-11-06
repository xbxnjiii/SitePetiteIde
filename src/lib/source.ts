// Provenance d'une visite (ex. lapetiteide.fr/?src=tiktok), transmise de page en page
// par l'adresse (aucun cookie, aucun stockage) puis enregistrée sur la vente Stripe.

/** Normalise la valeur : minuscules, lettres/chiffres/tirets, 30 caractères max. */
export function cleanSource(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.toLowerCase().trim().replace(/[^a-z0-9-]/g, "").slice(0, 30);
  return v || null;
}

/** Lit la provenance dans l'adresse actuelle (?src=… ou ?utm_source=…), côté navigateur. */
export function sourceFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  return cleanSource(p.get("src") ?? p.get("utm_source"));
}

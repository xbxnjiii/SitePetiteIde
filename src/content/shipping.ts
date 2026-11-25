// ============================================================================
//  LIVRAISON DES FICHES PAPIER — Mondial Relay ou Colissimo, en point relais
//  (ou locker / consigne) ou à domicile, France métropolitaine.
//  ⚠️ Prix et délais à valider par La Petite IDE.
// ============================================================================

export const SHIPPING = {
  /** Délai de préparation annoncé au client. */
  dispatch: "Expédié sous 2 jours ouvrés",
  zone: "France métropolitaine (Corse comprise)",
  zoneShort: "France métropolitaine",
  /** Codes postaux refusés : outre-mer (97…, 98…). */
  excludedPostalPrefixes: ["97", "98"],
};

export type Carrier = "mondial-relay" | "colissimo";
export type ShippingMethodId = "mr-relais" | "mr-domicile" | "colissimo-relais" | "colissimo-domicile";

export interface ShippingMethod {
  id: ShippingMethodId;
  carrier: Carrier;
  carrierName: string;
  /** Livraison en point relais / locker / consigne (le client choisit le point sur une carte). */
  relay: boolean;
  /** Libellé court du mode (« Point relais », « À domicile »…). */
  label: string;
  /** Prix TTC. */
  priceCents: number;
  /** Délai de livraison estimé après expédition (jours ouvrés), affiché par Stripe. */
  estimate: { min: number; max: number };
}

/** Modes de livraison, du moins cher au plus cher. */
export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: "mr-relais",
    carrier: "mondial-relay",
    carrierName: "Mondial Relay",
    relay: true,
    label: "Point relais",
    priceCents: 429,
    estimate: { min: 3, max: 5 },
  },
  {
    id: "colissimo-relais",
    carrier: "colissimo",
    carrierName: "Colissimo",
    relay: true,
    label: "Point retrait",
    priceCents: 479,
    estimate: { min: 2, max: 3 },
  },
  {
    id: "mr-domicile",
    carrier: "mondial-relay",
    carrierName: "Mondial Relay",
    relay: false,
    label: "À domicile",
    priceCents: 549,
    estimate: { min: 3, max: 5 },
  },
  {
    id: "colissimo-domicile",
    carrier: "colissimo",
    carrierName: "Colissimo",
    relay: false,
    label: "À domicile",
    priceCents: 629,
    estimate: { min: 2, max: 3 },
  },
];

export const getShippingMethod = (id: unknown): ShippingMethod | null => SHIPPING_METHODS.find((m) => m.id === id) ?? null;

/** Nom complet d'un mode, ex. « Mondial Relay · Point relais ». */
export const methodName = (m: ShippingMethod) => `${m.carrierName} · ${m.label}`;

/** Livraison offerte dès ce montant de panier (tout le panier, numérique compris, avant code promo)… */
export const FREE_SHIPPING_FROM_CENTS = 2500;
/** …uniquement avec ces transporteurs (Colissimo reste l'option « premium », toujours payante). */
export const FREE_SHIPPING_CARRIERS: Carrier[] = ["mondial-relay"];

/** Livraison offerte pour ce mode et ce montant de panier ? */
export const isShippingFree = (m: ShippingMethod, subtotalCents: number) =>
  FREE_SHIPPING_CARRIERS.includes(m.carrier) && subtotalCents >= FREE_SHIPPING_FROM_CENTS;

/** Frais de port d'un mode pour ce panier. */
export const shippingCents = (m: ShippingMethod, subtotalCents: number) => (isShippingFree(m, subtotalCents) ? 0 : m.priceCents);

/** Prix de livraison le plus bas (« livraison dès 4,29 € »). */
export const SHIPPING_FROM_CENTS = Math.min(...SHIPPING_METHODS.map((m) => m.priceCents));

/** Badges des modes proposés : le moins cher, et le plus rapide (le moins cher en cas d'égalité). */
export function methodBadges(methods: ShippingMethod[]): { cheapest: ShippingMethodId | null; fastest: ShippingMethodId | null } {
  if (!methods.length) return { cheapest: null, fastest: null };
  const byPrice = [...methods].sort((a, b) => a.priceCents - b.priceCents);
  const bySpeed = [...byPrice].sort((a, b) => a.estimate.max - b.estimate.max || a.estimate.min - b.estimate.min);
  const fastest = bySpeed[0];
  const cheapest = byPrice[0];
  // Un seul mode, ou le moins cher est aussi le plus rapide : un seul badge.
  return { cheapest: cheapest.id, fastest: methods.length > 1 && fastest.id !== cheapest.id ? fastest.id : null };
}

/** Point relais / locker / consigne choisi par le client sur la carte du transporteur. */
export interface RelayPoint {
  /** Identifiant du point chez le transporteur (à reporter sur l'étiquette). */
  id: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  /** Type de point (« Point Relais », « Locker », « Bureau de poste »…), si connu. */
  type?: string;
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Point relais reçu du navigateur : champs nettoyés, France métropolitaine uniquement. null si invalide. */
export function cleanRelayPoint(v: unknown): RelayPoint | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const point: RelayPoint = {
    id: clean(o.id, 20).toUpperCase(),
    name: clean(o.name, 80),
    address: clean(o.address, 120),
    postalCode: clean(o.postalCode, 5),
    city: clean(o.city, 60),
    ...(clean(o.type, 30) ? { type: clean(o.type, 30) } : {}),
  };
  if (!/^[A-Z0-9-]{2,20}$/.test(point.id) || !point.name || !point.address || !point.city) return null;
  return isDeliverable({ country: "FR", postal_code: point.postalCode }) ? point : null;
}

/** Téléphone français (portable ou fixe), au format 06 12 34 56 78. null si invalide. */
export function cleanPhone(v: unknown, mobileOnly = false): string | null {
  const digits = (typeof v === "string" ? v : "").replace(/[\s.\-()]/g, "").replace(/^(\+33|0033)/, "0");
  const ok = mobileOnly ? /^0[67]\d{8}$/.test(digits) : /^0[1-9]\d{8}$/.test(digits);
  return ok ? digits.replace(/(\d{2})(?=\d)/g, "$1 ") : null;
}

/** Transporteurs proposés à l'expédition (admin), avec leur nom affiché. */
export const CARRIERS: { id: Carrier; name: string }[] = [
  { id: "mondial-relay", name: "Mondial Relay" },
  { id: "colissimo", name: "Colissimo" },
];
export const parseCarrier = (v: unknown): Carrier | null => CARRIERS.find((c) => c.id === v)?.id ?? null;
export const carrierName = (c: Carrier) => CARRIERS.find((x) => x.id === c)?.name ?? c;

/** Lien de suivi du colis chez le transporteur. */
export function trackingUrl(carrier: Carrier | null, tracking: string, postalCode?: string | null): string {
  if (carrier === "mondial-relay") {
    return `https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition=${encodeURIComponent(tracking)}${postalCode ? `&codePostal=${encodeURIComponent(postalCode)}` : ""}`;
  }
  // Colissimo et anciens envois La Poste.
  return `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(tracking)}`;
}

/** Adresse livrable : France métropolitaine uniquement. */
export function isDeliverable(address: { country?: string | null; postal_code?: string | null } | null | undefined): boolean {
  if (!address || address.country !== "FR") return false;
  const cp = (address.postal_code ?? "").replace(/\s/g, "");
  return /^\d{5}$/.test(cp) && !SHIPPING.excludedPostalPrefixes.some((p) => cp.startsWith(p));
}

// Demande d'achat envoyée par les aperçus de fiches et la barre d'achat, écoutée par PackOffers.

export const BUY_EVENT = "lpi:acheter";

export interface BuyRequest {
  /** Fiche à acheter à l'unité (indice dans pack.items), ou null pour le pack. */
  fiche?: number | null;
}

export const requestBuy = (fiche: number | null = null) =>
  window.dispatchEvent(new CustomEvent<BuyRequest>(BUY_EVENT, { detail: { fiche } }));

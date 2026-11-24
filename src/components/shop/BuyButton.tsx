"use client";
import { requestBuy } from "./buy-event";

/** Bouton « Obtenir » de la barre d'achat : montre les versions (ou ouvre directement le paiement s'il n'y en a qu'une). */
export function BuyButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => requestBuy()}>
      {children}
    </button>
  );
}

"use client";
import { useEffect, useState } from "react";
import { OFFER, OFFER_APPLIED_EVENT, isOfferActive } from "@/content/offer";

/**
 * Bandeau de l'offre de lancement (masqué automatiquement après la date de fin).
 * Sur la page de vente, il n'apparaît que lorsque Stripe a réellement appliqué le code.
 */
export function OfferBanner({ variant = "page" }: { variant?: "page" | "bio" }) {
  const [active, setActive] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    setActive(isOfferActive());
    const onApplied = (e: Event) => setApplied(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener(OFFER_APPLIED_EVENT, onApplied);
    return () => window.removeEventListener(OFFER_APPLIED_EVENT, onApplied);
  }, []);

  if (!active || (variant === "page" && !applied)) return null;
  return (
    <div className={`offer-banner offer-banner--${variant}`} role="note">
      <span aria-hidden="true">🎉</span>
      <span>
        {variant === "page" ? (
          <>
            <strong>Offre de lancement {OFFER.label}</strong> jusqu&apos;au {OFFER.endsLabel} · appliquée automatiquement
          </>
        ) : (
          <>
            <strong>{OFFER.label}</strong> avec le code <strong>{OFFER.code}</strong> · jusqu&apos;au {OFFER.endsLabel}
          </>
        )}
      </span>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { OFFER, isOfferActive } from "@/content/offer";

/** Bandeau de l'offre de lancement (masqué automatiquement après la date de fin). */
export function OfferBanner({ variant = "page" }: { variant?: "page" | "bio" }) {
  const [active, setActive] = useState(false);
  useEffect(() => setActive(isOfferActive()), []);
  if (!active) return null;
  return (
    <div className={`offer-banner offer-banner--${variant}`} role="note">
      <span aria-hidden="true">🎉</span>
      <span>
        <strong>Offre de lancement {OFFER.label}</strong> jusqu&apos;au {OFFER.endsLabel}
        {variant === "page" ? " · appliquée automatiquement" : ` avec le code ${OFFER.code}`}
      </span>
    </div>
  );
}

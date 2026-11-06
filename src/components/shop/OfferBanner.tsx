"use client";
import { useEffect, useState } from "react";
import { OFFER, isOfferActive } from "@/content/offer";

/** Liseré de l'offre de lancement (masqué automatiquement après la date de fin). */
export function OfferBanner() {
  const [active, setActive] = useState(false);
  useEffect(() => setActive(isOfferActive()), []);
  if (!active) return null;
  return (
    <div className="offer-banner offer-banner--bio" role="note">
      <span aria-hidden="true">🎉</span>
      <span>
        <strong>{OFFER.label}</strong> avec le code <strong>{OFFER.code}</strong> · jusqu&apos;au {OFFER.endsLabel}
      </span>
    </div>
  );
}

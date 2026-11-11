"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export interface SheetPreview {
  title: string;
  src: string;
  width: number;
  height: number;
  /** Fiche réservée au pack complet (fiche bonus). */
  bonus?: boolean;
}

/** Événement écouté par le bloc de paiement : sélectionne une fiche à l'unité. */
export const PICK_FICHE_EVENT = "lpi:fiche";

/**
 * Aperçus des fiches (le bas de chaque image est flouté dans le fichier lui-même).
 * Défilement horizontal au doigt ; un appui agrandit la fiche, avec un bouton pour l'obtenir.
 */
export function SheetPreviews({
  sheets,
  packLabel,
  unitLabel,
}: {
  sheets: SheetPreview[];
  /** Ex. « Tout le pack · 3,99 € ». */
  packLabel: string;
  /** Ex. « Cette fiche · 0,99 € » (absent si la vente à l'unité est désactivée). */
  unitLabel?: string | null;
}) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % sheets.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + sheets.length) % sheets.length));
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, sheets.length]);

  const goBuy = (fiche: number | null) => {
    setOpen(null);
    if (fiche !== null) window.dispatchEvent(new CustomEvent(PICK_FICHE_EVENT, { detail: fiche }));
    requestAnimationFrame(() => document.getElementById("acheter")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const current = open === null ? null : sheets[open];

  return (
    <>
      <ul className="sheets" aria-label="Aperçu des fiches">
        {sheets.map((s, i) => (
          <li key={s.src}>
            <button type="button" className="sheet" onClick={() => setOpen(i)} aria-label={`Agrandir la fiche ${s.title}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt="" width={s.width} height={s.height} loading={i < 3 ? "eager" : "lazy"} />
              {s.bonus ? <span className="sheet__tag">Bonus 🎁</span> : null}
              <span className="sheet__title">{s.title}</span>
            </button>
          </li>
        ))}
      </ul>

      {current && open !== null ? (
        <div className="modal sheet-modal" role="presentation" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="modal__panel" role="dialog" aria-modal="true" aria-labelledby="sheet-modal-title">
            <div className="modal__head">
              <h2 id="sheet-modal-title">
                {current.title} <small>{open + 1}/{sheets.length}</small>
              </h2>
              <button type="button" className="modal__close" onClick={() => setOpen(null)} aria-label="Fermer">
                <Icon name="close" />
              </button>
            </div>
            <div className="sheet-modal__view">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.src} alt={`Aperçu de la fiche ${current.title} (bas de la fiche flouté)`} width={current.width} height={current.height} />
              <span className="sheet-modal__lock">🔒 La suite est dans {current.bonus ? "le pack" : "ta fiche"}</span>
              {sheets.length > 1 ? (
                <>
                  <button type="button" className="sheet-modal__nav sheet-modal__nav--prev" onClick={() => setOpen((open - 1 + sheets.length) % sheets.length)} aria-label="Fiche précédente">
                    <Icon name="arrow" />
                  </button>
                  <button type="button" className="sheet-modal__nav sheet-modal__nav--next" onClick={() => setOpen((open + 1) % sheets.length)} aria-label="Fiche suivante">
                    <Icon name="arrow" />
                  </button>
                </>
              ) : null}
            </div>
            <div className="sheet-modal__actions">
              <button type="button" className="btn btn--primary" onClick={() => goBuy(null)}>
                {packLabel}
              </button>
              {unitLabel && !current.bonus ? (
                <button type="button" className="btn btn--secondary" onClick={() => goBuy(open)}>
                  {unitLabel}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

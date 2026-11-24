"use client";
import { useEffect, useState } from "react";

/**
 * Barre d'achat mobile : visible seulement une fois l'en-tête de la page dépassé (elle ne cache pas le début de la page)
 * et quand aucun bouton d'achat principal n'est à l'écran.
 */
export function StickyBuyBar({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const anchors = Array.from(document.querySelectorAll("[data-buy-anchor]"));
    const onScreen = new Set<Element>();
    // Seuil : hauteur d'un écran moins la barre (le visiteur a commencé à lire la page).
    const scrolled = () => window.scrollY > Math.min(420, window.innerHeight * 0.5);
    const update = () => setVisible(scrolled() && onScreen.size === 0);
    let io: IntersectionObserver | null = null;
    if (anchors.length && "IntersectionObserver" in window) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => (e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target)));
        update();
      });
      anchors.forEach((a) => io!.observe(a));
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      io?.disconnect();
      window.removeEventListener("scroll", update);
    };
  }, []);
  return (
    <div className={visible ? "sticky-buy" : "sticky-buy sticky-buy--hidden"} aria-hidden={!visible}>
      {children}
    </div>
  );
}

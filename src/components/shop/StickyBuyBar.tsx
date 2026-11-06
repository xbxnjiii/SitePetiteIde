"use client";
import { useEffect, useState } from "react";

/** Barre d'achat mobile : visible seulement quand aucun bouton d'achat principal n'est à l'écran. */
export function StickyBuyBar({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const anchors = Array.from(document.querySelectorAll("[data-buy-anchor]"));
    if (!anchors.length || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const onScreen = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target)));
      setVisible(onScreen.size === 0);
    });
    anchors.forEach((a) => io.observe(a));
    return () => io.disconnect();
  }, []);
  return (
    <div className={visible ? "sticky-buy" : "sticky-buy sticky-buy--hidden"} aria-hidden={!visible}>
      {children}
    </div>
  );
}

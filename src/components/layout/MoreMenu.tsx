"use client";
import { useEffect, useRef } from "react";

/** Bouton « ••• » du pied de page : déplie les liens ; se referme au clic ailleurs, à Échap ou après un clic sur un lien. */
export function MoreMenu({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node) || (e.target as HTMLElement).closest("a")) el.open = false;
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  return (
    <details className="more" ref={ref}>
      <summary aria-label="Plus de liens : aide et informations légales">
        <span aria-hidden="true">•••</span>
      </summary>
      {children}
    </details>
  );
}

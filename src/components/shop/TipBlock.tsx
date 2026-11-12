"use client";
import { useEffect, useState } from "react";
import { sourceFromLocation } from "@/lib/source";

/** Soutien volontaire (1, 2 ou 5 €) — bas de la page de liens. */
export function TipBlock() {
  const [src, setSrc] = useState("");
  useEffect(() => setSrc(sourceFromLocation() ?? ""), []);
  return (
    <section className="tip tip--compact" aria-labelledby="tip-title">
      <p id="tip-title" className="tip__title">
        💙 Nous soutenir
      </p>
      <p className="tip__text">Un petit geste pour nous aider à créer de nouvelles fiches et de nouveaux quiz.</p>
      <div className="tip__amounts">
        {[100, 200, 500].map((cents) => (
          <form key={cents} method="post" action="/api/tip">
            <input type="hidden" name="amount" value={cents} />
            {src ? <input type="hidden" name="source" value={src} /> : null}
            <button type="submit" className="tip__btn">
              {cents / 100} €
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}

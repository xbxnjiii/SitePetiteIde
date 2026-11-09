"use client";
import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  paiement: "Le paiement n'a pas pu démarrer. Réessaie dans un instant — si le problème continue, écris-nous.",
  cgv: "Coche la case d'acceptation des CGV pour continuer.",
  indisponible: "Les fiches papier sont momentanément indisponibles. La version numérique reste disponible tout de suite.",
  fiches: "Choisis au moins une fiche.",
  prix: "Ce pack est momentanément indisponible. Réessaie un peu plus tard ou contacte-nous.",
};

export function CheckoutError() {
  const code = useSearchParams().get("erreur");
  const msg = code ? MESSAGES[code] : null;
  return msg ? <p className="alert" role="alert">{msg}</p> : null;
}

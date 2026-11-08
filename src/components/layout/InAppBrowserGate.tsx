"use client";
import { useEffect, useState } from "react";

// Navigateurs intégrés aux applis (TikTok, Instagram, Facebook, Snapchat…) : paiement Apple Pay / Google Pay
// et téléchargements y fonctionnent mal. On propose d'ouvrir la page dans le vrai navigateur du téléphone.
const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|musical_ly|BytedanceWebview|TikTok|trill_|Snapchat|Pinterest|LinkedInApp|Twitter/i;
const DISMISS_KEY = "lpi-inapp-continue";

type App = "tiktok" | "instagram" | "facebook" | "autre";

function detect(ua: string): App | null {
  if (!IN_APP.test(ua)) return null;
  if (/musical_ly|BytedanceWebview|TikTok|trill_/i.test(ua)) return "tiktok";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return "facebook";
  return "autre";
}

const APP_NAME: Record<App, string> = { tiktok: "TikTok", instagram: "Instagram", facebook: "Facebook", autre: "l'application" };

export function InAppBrowserGate() {
  const [app, setApp] = useState<App | null>(null);
  const [ios, setIos] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* stockage indisponible */
    }
    if (dismissed || window.location.pathname.startsWith("/admin")) return;
    const found = detect(navigator.userAgent);
    if (!found) return;
    setIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    setApp(found);
  }, []);

  useEffect(() => {
    if (!app) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [app]);

  if (!app) return null;

  const url = typeof window !== "undefined" ? window.location.href : "https://lapetiteide.fr/";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      /* copie impossible */
    }
  };

  const stay = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* stockage indisponible */
    }
    setApp(null);
  };

  const label = app === "tiktok" ? "Ouvrir dans le navigateur" : ios ? "Ouvrir dans le navigateur externe" : "Ouvrir dans Chrome";

  return (
    <div className="inapp" role="dialog" aria-modal="true" aria-labelledby="inapp-title">
      <div className="inapp__card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-rond-256.webp" alt="" width={84} height={84} className="inapp__logo" />
        <h2 id="inapp-title">Ouvre La Petite IDE dans ton navigateur</h2>
        <p className="inapp__text">
          Le navigateur de {APP_NAME[app]} bloque {ios ? "Apple Pay" : "Google Pay"} et les téléchargements. Dans {ios ? "Safari" : "Chrome"}, tout
          fonctionne 💙
        </p>

        <ol className="inapp__steps">
          <li>
            Appuie sur <b className="inapp__key">⋯</b> en haut à droite
          </li>
          <li>
            Choisis <b>« {label} »</b>
          </li>
        </ol>

        <button type="button" className="inapp__copy" onClick={copy}>
          {copied ? "Lien copié ✓ colle-le dans ton navigateur" : "Copier le lien"}
        </button>
        <div className="inapp__or" aria-hidden="true">
          <span>ou</span>
        </div>
        <button type="button" className="inapp__stay" onClick={stay}>
          <span className="inapp__stay-text">
            <strong>Continuer ici</strong>
            <span>Rester dans {APP_NAME[app]}</span>
          </span>
          <span className="inapp__stay-go" aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}

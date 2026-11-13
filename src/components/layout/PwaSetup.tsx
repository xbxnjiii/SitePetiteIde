"use client";
import { useEffect } from "react";

/** Active le mode « application » : service worker (pages déjà vues disponibles hors connexion) et invitation à installer. */
export function PwaSetup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => {});
    const onPrompt = (e: Event) => {
      e.preventDefault(); // on propose l'installation au bon moment (fenêtre « Ma progression »)
      (window as unknown as { __lpiInstall?: Event }).__lpiInstall = e;
      window.dispatchEvent(new Event("lpi:install"));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  return null;
}

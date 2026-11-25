"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { type Carrier, type RelayPoint, cleanRelayPoint } from "@/content/shipping";

// Carte officielle du transporteur pour choisir un point relais / locker / consigne :
//  - Mondial Relay : widget « Parcelshop Picker » (jQuery + Leaflet), avec le code enseigne ;
//  - Colissimo : widget « Point Retrait » (jQuery 3.6+ + Mapbox GL 2.6.1), avec un jeton obtenu
//    côté serveur (/api/livraison/colissimo) à partir de la clé d'API Colissimo Entreprise.
// Les scripts ne sont chargés qu'à l'ouverture de la carte.

const JQUERY = "https://code.jquery.com/jquery-3.7.1.min.js";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const MR_PLUGIN = "https://widget.mondialrelay.com/parcelshop-picker/jquery.plugin.mondialrelay.parcelshoppicker.min.js";
const MAPBOX_JS = "https://api.mapbox.com/mapbox-gl-js/v2.6.1/mapbox-gl.js";
const MAPBOX_CSS = "https://api.mapbox.com/mapbox-gl-js/v2.6.1/mapbox-gl.css";
const COLISSIMO_PLUGIN = "https://ws.colissimo.fr/widget-colissimo/js/jquery.plugin.colissimo.min.js";

const loading = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  if (!loading.has(src)) {
    loading.set(
      src,
      new Promise((resolve, reject) => {
        const el = document.createElement("script");
        el.src = src;
        el.async = false; // ordre d'exécution conservé (jQuery avant le plugin)
        el.onload = () => resolve();
        el.onerror = () => {
          loading.delete(src);
          reject(new Error(src));
        };
        document.head.appendChild(el);
      }),
    );
  }
  return loading.get(src)!;
}
function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const el = document.createElement("link");
  el.rel = "stylesheet";
  el.href = href;
  document.head.appendChild(el);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    jQuery?: any;
    lpiColissimoPick?: (point: any) => void;
  }
}

/** Point renvoyé par la carte Mondial Relay (ID, Nom, Adresse1, CP, Ville, Pays…). */
function fromMondialRelay(d: any): RelayPoint | null {
  if (!d || (d.Pays && d.Pays !== "FR")) return null;
  const name = String(d.Nom ?? "").trim();
  return cleanRelayPoint({
    id: d.ID,
    name,
    address: [d.Adresse1, d.Adresse2].filter((x: unknown) => typeof x === "string" && x.trim()).join(", "),
    postalCode: d.CP,
    city: d.Ville,
    type: /locker/i.test(name) ? "Locker" : "Point Relais",
  });
}

const COLISSIMO_TYPES: Record<string, string> = {
  BPR: "Bureau de poste",
  ACP: "Agence postale",
  CDI: "Bureau de poste",
  BDP: "Bureau de poste",
  A2P: "Relais Pickup",
  CMT: "Relais Pickup",
  PCS: "Consigne Pickup",
};

/** Point renvoyé par la carte Colissimo (identifiant, nom, adresse1, codePostal, localite, typeDePoint…). */
function fromColissimo(p: any): RelayPoint | null {
  if (!p || (p.codePays && p.codePays !== "FR")) return null;
  const type = COLISSIMO_TYPES[String(p.typeDePoint ?? "")] ?? (/consigne/i.test(String(p.nom ?? "")) ? "Consigne Pickup" : "Point retrait");
  return cleanRelayPoint({
    id: p.identifiant,
    name: p.nom,
    address: [p.adresse1, p.adresse2, p.adresse3].filter((x: unknown) => typeof x === "string" && x.trim()).join(", "),
    postalCode: p.codePostal,
    city: p.localite,
    type,
  });
}

export function RelayPicker({
  carrier,
  brand,
  onPick,
  onClose,
}: {
  carrier: Carrier;
  /** Code enseigne Mondial Relay. */
  brand: string | null;
  onPick: (point: RelayPoint) => void;
  onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [pending, setPending] = useState<RelayPoint | null>(null);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const el = box.current;
    const timeout = window.setTimeout(() => !cancelled && setStatus((s) => (s === "loading" ? "error" : s)), 20_000);
    (async () => {
      try {
        if (carrier === "mondial-relay") {
          if (!brand) throw new Error("brand");
          loadCss(LEAFLET_CSS);
          await loadScript(JQUERY);
          await loadScript(LEAFLET_JS);
          await loadScript(MR_PLUGIN);
          if (cancelled || !el) return;
          window.jQuery(el).MR_ParcelShopPicker({
            Target: "#relay-target",
            Brand: brand,
            Country: "FR",
            PostCode: "",
            ColLivMod: "24R",
            NbResults: "7",
            Responsive: true,
            ShowResultsOnMap: true,
            OnParcelShopSelected: (data: any) => {
              const point = fromMondialRelay(data);
              setInvalid(!point);
              setPending(point);
            },
          });
        } else {
          const r = await fetch("/api/livraison/colissimo", { method: "POST" });
          const { token } = ((await r.json().catch(() => ({}))) ?? {}) as { token?: string };
          if (!r.ok || !token) throw new Error("token");
          loadCss(MAPBOX_CSS);
          await loadScript(JQUERY);
          await loadScript(MAPBOX_JS);
          await loadScript(COLISSIMO_PLUGIN);
          if (cancelled || !el) return;
          // La carte Colissimo appelle cette fonction (par son nom) quand le client valide un point.
          window.lpiColissimoPick = (raw: any) => {
            const point = fromColissimo(raw);
            if (!point) return setInvalid(true);
            try {
              window.jQuery(el).frameColissimoClose();
            } catch {}
            pick.current(point);
          };
          window.jQuery(el).frameColissimoOpen({
            URLColissimo: "https://ws.colissimo.fr",
            callBackFrame: "lpiColissimoPick",
            ceCountry: "FR",
            ceCountryList: "FR",
            dyPreparationTime: "2",
            origin: "WIDGET",
            filterRelay: "1",
            token,
          });
        }
        if (!cancelled) setStatus("ready");
      } catch (err) {
        console.error("relais:", err instanceof Error ? err.message : err);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      if (carrier === "colissimo") {
        try {
          window.jQuery?.(el).frameColissimoClose();
        } catch {}
        delete window.lpiColissimoPick;
      }
    };
  }, [carrier, brand]);

  return (
    <div className="modal relay-picker" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__panel" role="dialog" aria-modal="true" aria-labelledby="relay-picker-title">
        <div className="modal__head">
          <h2 id="relay-picker-title">{carrier === "mondial-relay" ? "Ton Point Relais ou Locker" : "Ton point retrait Colissimo"}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
            <Icon name="close" />
          </button>
        </div>
        {status === "loading" ? <div className="checkout__loading" aria-label="Chargement de la carte" /> : null}
        {status === "error" ? (
          <p className="alert" role="alert">
            La carte des points relais ne se charge pas. Réessaie dans un instant, ou choisis la livraison à domicile.
          </p>
        ) : null}
        <input type="hidden" id="relay-target" />
        <div ref={box} className="relay-picker__widget" />
        {invalid ? (
          <p className="alert" role="alert">
            Ce point n&apos;est pas utilisable : on livre seulement en France métropolitaine (Corse comprise).
          </p>
        ) : null}
        {pending ? (
          <div className="relay-picker__confirm">
            <p>
              <strong>{pending.name}</strong>
              <span>
                {pending.address}, {pending.postalCode} {pending.city}
              </span>
            </p>
            <button type="button" className="btn btn--primary" onClick={() => pick.current(pending)}>
              Choisir ce point
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

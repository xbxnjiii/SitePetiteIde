"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/format";
import {
  type Carrier,
  type RelayPoint,
  SHIPPING,
  type ShippingMethod,
  isShippingFree,
  methodBadges,
  shippingCents,
} from "@/content/shipping";
import { RelayPicker } from "./RelayPicker";

export interface ShippingChoice {
  method: ShippingMethod | null;
  /** Point relais choisi, par transporteur (gardé si l'on change de mode). */
  relays: Partial<Record<Carrier, RelayPoint>>;
}

/** Point relais du mode choisi (null pour un mode à domicile ou un point pas encore choisi). */
export const chosenRelay = (c: ShippingChoice) => (c.method?.relay ? (c.relays[c.method.carrier] ?? null) : null);

/** Choix prêt pour le paiement : mode choisi, et point relais choisi si besoin. */
export const shippingReady = (c: ShippingChoice) => Boolean(c.method && (!c.method.relay || chosenRelay(c)));

/** Choix du mode de livraison (badges, livraison offerte) et du point relais sur la carte du transporteur. */
export function ShippingChooser({
  id,
  methods,
  subtotalCents,
  mondialRelayBrand,
  value,
  onChange,
}: {
  id: string;
  methods: ShippingMethod[];
  /** Montant du panier (pour la livraison offerte). */
  subtotalCents: number;
  mondialRelayBrand: string | null;
  value: ShippingChoice;
  onChange: (v: ShippingChoice) => void;
}) {
  const { method, relays } = value;
  const relay = chosenRelay(value);
  const [picker, setPicker] = useState<Carrier | null>(null);
  // Code postal de recherche : la carte s'ouvre directement sur les points autour (mémorisé sur l'appareil).
  const [postalCode, setPostalCode] = useState("");
  useEffect(() => {
    try {
      setPostalCode(localStorage.getItem("lpi:cp") ?? "");
    } catch {}
  }, []);
  const cpOk = /^\d{5}$/.test(postalCode);
  const openPicker = (carrier: Carrier) => {
    if (!cpOk) return document.getElementById(`cp-${id}`)?.focus();
    try {
      localStorage.setItem("lpi:cp", postalCode);
    } catch {}
    setPicker(carrier);
  };
  // Échap ferme la carte avant la fenêtre qui la contient.
  const pickerRef = useRef(picker);
  pickerRef.current = picker;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pickerRef.current) {
        e.stopImmediatePropagation();
        setPicker(null);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, []);

  const effective = methods.map((m) => ({ ...m, priceCents: shippingCents(m, subtotalCents) }));
  const badges = methodBadges(effective);

  return (
    <fieldset className="ship-step">
      <legend className="ship-step__title">
        <Icon name="truck" /> Livraison <small>{SHIPPING.dispatch.toLowerCase()}</small>
      </legend>
      <div className="ship-methods">
        {methods.map((m) => {
          const free = isShippingFree(m, subtotalCents);
          return (
            <label key={m.id} className={method?.id === m.id ? "ship-method ship-method--on" : "ship-method"}>
              <input type="radio" name={`livraison-${id}`} checked={method?.id === m.id} onChange={() => onChange({ ...value, method: m })} />
              <span className="ship-method__radio" aria-hidden="true" />
              <span className="ship-method__text">
                <strong>
                  {m.carrierName} · {m.label}
                </strong>
                <small>
                  {m.estimate.min} à {m.estimate.max} jours
                  {badges.cheapest === m.id && !free ? (
                    <span className="ship-badge ship-badge--cheap">
                      <Icon name="tag" /> Le moins cher
                    </span>
                  ) : badges.fastest === m.id ? (
                    <span className="ship-badge ship-badge--fast">
                      <Icon name="bolt" /> Le plus rapide
                    </span>
                  ) : null}
                </small>
              </span>
              <span className="ship-method__price">
                {free ? (
                  <>
                    <s>{formatPrice(m.priceCents)}</s> <span className="ship-method__free">Offert</span>
                  </>
                ) : (
                  formatPrice(m.priceCents)
                )}
              </span>
            </label>
          );
        })}
      </div>
      {method?.relay ? (
        relay ? (
          <div className="relay-chosen">
            <Icon name="pin" />
            <p>
              <strong>{relay.name}</strong>
              <span>
                {relay.address}, {relay.postalCode} {relay.city}
              </span>
            </p>
            <button type="button" className="link-btn" onClick={() => onChange({ ...value, relays: { ...relays, [method.carrier]: undefined } })}>
              Changer
            </button>
          </div>
        ) : (
          <form
            className="relay-search"
            onSubmit={(e) => {
              e.preventDefault();
              openPicker(method.carrier);
            }}
          >
            <label htmlFor={`cp-${id}`}>Ton code postal</label>
            <input
              id={`cp-${id}`}
              className="input"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              placeholder="75001"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
            />
            <button type="submit" className="btn btn--primary" disabled={!cpOk}>
              <Icon name="pin" /> Voir les {method.carrier === "mondial-relay" ? "points relais" : "points retrait"}
            </button>
          </form>
        )
      ) : null}
      {picker ? (
        <RelayPicker
          carrier={picker}
          postalCode={postalCode}
          brand={mondialRelayBrand}
          onClose={() => setPicker(null)}
          onPick={(point) => {
            onChange({ ...value, relays: { ...relays, [picker]: point } });
            setPicker(null);
          }}
        />
      ) : null}
    </fieldset>
  );
}

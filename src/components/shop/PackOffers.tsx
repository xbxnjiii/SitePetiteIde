"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/format";
import type { PackFormat } from "@/content/packs";
import { type Carrier, type RelayPoint, SHIPPING, type ShippingMethod, methodBadges } from "@/content/shipping";
import { CheckoutPanel, FichePicker, type UnitOffer } from "./PackCheckout";
import { RelayPicker } from "./RelayPicker";
import { BUY_EVENT, type BuyRequest } from "./buy-event";

// Choix de la version (page de vente) : deux cartes produit (numérique / fiches de poche),
// un lien discret pour l'unité, puis le paiement dans une fenêtre (bas d'écran sur téléphone).

interface Photo {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface PaperOffer {
  priceCents: number;
  specs: string[];
  photo: Photo | null;
  soldOut: boolean;
  /** Modes de livraison proposés (du moins cher au plus cher). */
  shippingMethods: ShippingMethod[];
  /** Code enseigne de la carte Mondial Relay (null : carte indisponible). */
  mondialRelayBrand: string | null;
}

/** Autre format expédié : fiches de révision A4, ou pack complet (numérique + poche + révision). */
export interface ExtraOffer {
  priceCents: number;
  specs: string[];
  photo: Photo | null;
  soldOut: boolean;
  /** Pack complet : total des formats achetés séparément (pour afficher l'économie). */
  separateCents?: number;
}

interface Props {
  slug: string;
  packName: string;
  packCents: number;
  /** Nombre de fiches du pack complet (fiche bonus comprise). */
  packCount: number;
  packImage: Photo | null;
  print: PaperOffer | null;
  revision: ExtraOffer | null;
  bundle: ExtraOffer | null;
  /** Livraison des formats expédiés (commune à tous). */
  shipping: { methods: ShippingMethod[]; mondialRelayBrand: string | null };
  unit: UnitOffer | null;
}

type Open = { format: PackFormat; fiches: number[] };

export function PackOffers({ slug, packName, packCents, packCount, packImage, print, revision, bundle, shipping, unit }: Props) {
  const [open, setOpen] = useState<Open | null>(null);
  const paperOn = Boolean(print && !print.soldOut);

  // Depuis un aperçu de fiche ou la barre d'achat : ouvre la bonne fenêtre (ou montre les deux versions).
  useEffect(() => {
    const onBuy = (e: Event) => {
      const { fiche } = (e as CustomEvent<BuyRequest>).detail ?? {};
      if (unit && typeof fiche === "number" && fiche >= 0 && fiche < unit.items.length) {
        setOpen({ format: "fiches", fiches: [fiche] });
      } else if (print || revision) {
        requestAnimationFrame(() => document.getElementById("acheter")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      } else {
        setOpen({ format: "pdf", fiches: [] });
      }
    };
    window.addEventListener(BUY_EVENT, onBuy);
    return () => window.removeEventListener(BUY_EVENT, onBuy);
  }, [unit, print, revision]);
  const fromShipping = shipping.methods.length ? Math.min(...shipping.methods.map((m) => m.priceCents)) : null;

  return (
    <div className="offers" id="acheter" data-buy-anchor="">
      {print || revision ? <h2 className="offers__title">Choisis ta version</h2> : null}
      <div className="offers__list">
        <article className="offer">
          {packImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="offer__img" src={packImage.src} alt="" width={packImage.width} height={packImage.height} loading="lazy" />
          ) : null}
          <div className="offer__body">
            <p className="offer__kicker">
              <Icon name="phone" /> Version numérique
            </p>
            <h3 className="offer__title">Sur ton téléphone, tout de suite</h3>
            <ul className="offer__points">
              <li>{packCount} fiches en PDF et en images</li>
              <li>Reçues par email après le paiement</li>
            </ul>
          </div>
          <div className="offer__foot">
            <p className="offer__price">
              <span className="price">{formatPrice(packCents)}</span>
              <small className="offer__per">
                soit {formatPrice(Math.round(packCents / packCount))} la fiche
              </small>
            </p>
            <button type="button" className="btn btn--primary btn--buy offer__btn" onClick={() => setOpen({ format: "pdf", fiches: [] })}>
              Je la veux
            </button>
          </div>
        </article>

        {print ? (
          <article className={paperOn ? "offer offer--paper" : "offer offer--paper offer--off"}>
            <span className="offer__badge">Idéal en stage</span>
            {print.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="offer__img" src={print.photo.src} alt="" width={print.photo.width} height={print.photo.height} loading="lazy" />
            ) : null}
            <div className="offer__body">
              <p className="offer__kicker">
                <Icon name="note" /> Fiches de poche
              </p>
              <h3 className="offer__title">À glisser dans ta blouse</h3>
              <ul className="offer__points">
                <li>{print.specs.join(" · ")}</li>
                <li>
                  <strong>+ version numérique offerte</strong>
                </li>
              </ul>
            </div>
            <div className="offer__foot">
              <p className="offer__price">
                <span className="price">{formatPrice(print.priceCents)}</span>
                {print.shippingMethods.length ? (
                  <small>+ livraison dès {formatPrice(Math.min(...print.shippingMethods.map((m) => m.priceCents)))}</small>
                ) : null}
              </p>
              <button
                type="button"
                className="btn btn--primary btn--buy offer__btn"
                disabled={!paperOn}
                onClick={() => setOpen({ format: "papier", fiches: [] })}
              >
                {paperOn ? "Je les veux" : "Bientôt de retour"}
              </button>
            </div>
          </article>
        ) : null}

        {revision ? (
          <article className={revision.soldOut ? "offer offer--revision offer--off" : "offer offer--revision"}>
            <span className="offer__badge offer__badge--revision">Pour réviser</span>
            {revision.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="offer__img" src={revision.photo.src} alt="" width={revision.photo.width} height={revision.photo.height} loading="lazy" />
            ) : null}
            <div className="offer__body">
              <p className="offer__kicker">
                <Icon name="note" /> Fiches de révision
              </p>
              <h3 className="offer__title">Complète, corrige, recommence</h3>
              <ul className="offer__points">
                <li>{revision.specs.join(" · ")}</li>
                <li>
                  <strong>+ version numérique offerte</strong>
                </li>
              </ul>
            </div>
            <div className="offer__foot">
              <p className="offer__price">
                <span className="price">{formatPrice(revision.priceCents)}</span>
                {fromShipping !== null ? <small>+ livraison dès {formatPrice(fromShipping)}</small> : null}
              </p>
              <button
                type="button"
                className="btn btn--primary btn--buy offer__btn"
                disabled={revision.soldOut}
                onClick={() => setOpen({ format: "revision", fiches: [] })}
              >
                {revision.soldOut ? "Bientôt de retour" : "Je les veux"}
              </button>
            </div>
          </article>
        ) : null}

        {bundle ? (
          <article className={bundle.soldOut ? "offer offer--bundle offer--off" : "offer offer--bundle"}>
            <span className="offer__badge offer__badge--bundle">Meilleure offre</span>
            {bundle.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="offer__img" src={bundle.photo.src} alt="" width={bundle.photo.width} height={bundle.photo.height} loading="lazy" />
            ) : null}
            <div className="offer__body">
              <p className="offer__kicker">
                <Icon name="gift" /> Pack complet
              </p>
              <h3 className="offer__title">Tout pour réussir</h3>
              <ul className="offer__points">
                <li>Numérique + fiches de poche + fiches de révision</li>
                {bundle.separateCents && bundle.separateCents > bundle.priceCents ? (
                  <li>
                    <strong>Tu économises {formatPrice(bundle.separateCents - bundle.priceCents)}</strong>
                  </li>
                ) : null}
              </ul>
            </div>
            <div className="offer__foot">
              <p className="offer__price">
                <span className="price">{formatPrice(bundle.priceCents)}</span>
                {fromShipping !== null ? <small>+ livraison dès {formatPrice(fromShipping)}</small> : null}
              </p>
              <button
                type="button"
                className="btn btn--primary btn--buy offer__btn"
                disabled={bundle.soldOut}
                onClick={() => setOpen({ format: "complet", fiches: [] })}
              >
                {bundle.soldOut ? "Bientôt de retour" : "Je le veux"}
              </button>
            </div>
          </article>
        ) : null}
      </div>

      {unit ? (
        <button type="button" className="offers__unit" onClick={() => setOpen({ format: "fiches", fiches: [] })}>
          Besoin d&apos;une seule fiche ? <span>À partir de {formatPrice(unit.priceCents)}</span>
        </button>
      ) : null}

      {open ? (
        <BuySheet
          key={open.format}
          slug={slug}
          packName={packName}
          packCents={packCents}
          packCount={packCount}
          packImage={packImage}
          print={print}
          revision={revision}
          bundle={bundle}
          shipping={shipping}
          unit={unit}
          initial={open}
          onSwitch={(format) => setOpen({ format, fiches: [] })}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}

/** Fenêtre d'achat : rappel du produit choisi, choix des fiches (unité), puis paiement. */
function BuySheet({
  slug,
  packName,
  packCents,
  packCount,
  packImage,
  print,
  revision,
  bundle,
  shipping,
  unit,
  initial,
  onSwitch,
  onClose,
}: Props & { initial: Open; onSwitch: (f: PackFormat) => void; onClose: () => void }) {
  const { format } = initial;
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const [picked, setPicked] = useState<number[]>(initial.fiches);
  // Unité : la session de paiement n'est recréée qu'une fois la sélection stabilisée (pas à chaque clic).
  const [fiches, setFiches] = useState<number[]>(initial.fiches);
  useEffect(() => {
    const t = window.setTimeout(() => setFiches(picked), 600);
    return () => window.clearTimeout(t);
  }, [picked]);

  useEffect(() => {
    // Échap : ferme la carte des points relais si elle est ouverte, sinon la fenêtre d'achat.
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (pickerOpen.current ? setPicker(null) : close.current());
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  // Papier : mode de livraison et point relais choisi (un par transporteur, gardé si l'on change de mode).
  const [method, setMethod] = useState<ShippingMethod | null>(null);
  const [relays, setRelays] = useState<Partial<Record<Carrier, RelayPoint>>>({});
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
    if (!cpOk) {
      document.getElementById(`cp-${slug}`)?.focus();
      return;
    }
    try {
      localStorage.setItem("lpi:cp", postalCode);
    } catch {}
    setPicker(carrier);
  };
  const pickerOpen = useRef(false);
  pickerOpen.current = picker !== null;
  const relay = method?.relay ? (relays[method.carrier] ?? null) : null;
  const chooseMethod = (m: ShippingMethod) => {
    setMethod(m);
  };

  const isUnit = format === "fiches" && unit;
  // Formats expédiés : fiches de poche, fiches de révision, pack complet.
  const phys =
    format === "papier" && print
      ? { priceCents: print.priceCents, photo: print.photo, title: "Fiches de poche", subtitle: `${packName} · ${packCount} fiches plastifiées` }
      : format === "revision" && revision
        ? { priceCents: revision.priceCents, photo: revision.photo, title: "Fiches de révision", subtitle: `${packName} · fiches A4 recto à compléter, verso corrigé` }
        : format === "complet" && bundle
          ? { priceCents: bundle.priceCents, photo: bundle.photo, title: "Pack complet", subtitle: `${packName} · numérique + poche + révision` }
          : null;
  const thumb = phys?.photo ?? packImage;
  const title = phys ? phys.title : isUnit ? "Fiches à l'unité" : "Version numérique";
  const subtitle = phys
    ? phys.subtitle
    : isUnit
      ? `${packName} · ${formatPrice(unit.priceCents)} la fiche`
      : `${packName} · ${packCount} fiches · PDF et images`;
  const isPaper = phys;
  const shippingCents = isPaper && method ? method.priceCents : 0;
  const priceCents = (isPaper ? isPaper.priceCents + shippingCents : isUnit ? unit.priceCents * fiches.length : packCents);
  const paperReady = Boolean(method && (!method.relay || relay));
  const badges = methodBadges(shipping.methods);
  const settled = fiches.join() === picked.join();

  return (
    <div className="modal buy-sheet" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__panel" role="dialog" aria-modal="true" aria-labelledby="buy-sheet-title" tabIndex={-1} ref={panel}>
        <div className="buy-sheet__head">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="buy-sheet__thumb" src={thumb.src} alt="" width={thumb.width} height={thumb.height} />
          ) : null}
          <div className="buy-sheet__what">
            <h2 id="buy-sheet-title">{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
            <Icon name="close" />
          </button>
        </div>

        {isUnit ? (
          <FichePicker unit={unit} packCents={packCents} picked={picked} onChange={setPicked} onPickPack={() => onSwitch("pdf")} />
        ) : isPaper ? (
          <>
            <fieldset className="ship-step">
              <legend className="ship-step__title">
                <Icon name="truck" /> Livraison <small>{SHIPPING.dispatch.toLowerCase()}</small>
              </legend>
              <div className="ship-methods">
                {shipping.methods.map((m) => (
                  <label key={m.id} className={method?.id === m.id ? "ship-method ship-method--on" : "ship-method"}>
                    <input type="radio" name={`livraison-${slug}`} checked={method?.id === m.id} onChange={() => chooseMethod(m)} />
                    <span className="ship-method__radio" aria-hidden="true" />
                    <span className="ship-method__text">
                      <strong>
                        {m.carrierName} · {m.label}
                      </strong>
                      <small>
                        {m.estimate.min} à {m.estimate.max} jours
                        {badges.cheapest === m.id ? (
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
                    <span className="ship-method__price">{formatPrice(m.priceCents)}</span>
                  </label>
                ))}
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
                    <button type="button" className="link-btn" onClick={() => setRelays((r) => ({ ...r, [method.carrier]: undefined }))}>
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
                    <label htmlFor={`cp-${slug}`}>Ton code postal</label>
                    <input
                      id={`cp-${slug}`}
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
            </fieldset>
            <div className="buy-sheet__total">
              <span>
                {format === "complet" ? "Pack" : "Fiches"} {formatPrice(isPaper.priceCents)} + livraison {method ? formatPrice(shippingCents) : "à choisir"} · numérique offert
              </span>
              <strong className="price">{formatPrice(priceCents)}</strong>
            </div>
          </>
        ) : (
          <div className="buy-sheet__total">
            <span>Accès immédiat · mises à jour offertes</span>
            <strong className="price">{formatPrice(priceCents)}</strong>
          </div>
        )}

        {isPaper && !paperReady ? (
          <p className="buy-sheet__hint">
            {method ? "Choisis ton point relais pour passer au paiement." : "Choisis ton mode de livraison pour passer au paiement."}
          </p>
        ) : isUnit && (!picked.length || !settled) ? (
          picked.length ? <div className="checkout__loading" aria-label="Mise à jour du paiement" /> : null
        ) : (
          <CheckoutPanel
            key={isUnit ? `fiches-${fiches.join(",")}` : isPaper ? `${format}-${method?.id}-${relay?.id ?? ""}` : format}
            slug={slug}
            format={format}
            fiches={isUnit ? fiches : null}
            priceCents={priceCents}
            shipping={isPaper && method ? { method, relay } : null}
          />
        )}

        {picker ? (
          <RelayPicker
            carrier={picker}
            postalCode={postalCode}
            brand={shipping.mondialRelayBrand}
            onClose={() => setPicker(null)}
            onPick={(point) => {
              setRelays((r) => ({ ...r, [picker]: point }));
              setPicker(null);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

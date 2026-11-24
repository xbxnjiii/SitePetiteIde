"use client";
import { loadStripe, type Appearance, type StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import {
  CheckoutElementsProvider,
  ExpressCheckoutElement,
  PaymentElement,
  ShippingAddressElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/format";
import { OFFER } from "@/content/offer";
import type { IconName, PackFormat } from "@/content/packs";
import { SHIPPING, isDeliverable } from "@/content/shipping";
import { sourceFromLocation } from "@/lib/source";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/stripe-public";

// Paiement (Stripe « Elements » + Checkout Sessions), affiché dans la fenêtre d'achat (voir PackOffers.tsx) :
//  - Apple Pay / Google Pay en premier sur les appareils compatibles ;
//  - sinon, ou au choix, paiement par carte dans la même fenêtre ;
//  - secours : bouton vers la page de paiement hébergée par Stripe si le chargement échoue.

// Une seule instance Stripe par clé publique. La clé vient du serveur (configuration du Worker),
// avec la clé intégrée au build en secours.
const stripeByKey = new Map<string, ReturnType<typeof loadStripe>>();
const getStripe = (key: string = STRIPE_PUBLISHABLE_KEY) => {
  if (!stripeByKey.has(key)) stripeByKey.set(key, loadStripe(key, { locale: "fr" }));
  return stripeByKey.get(key)!;
};

const appearance: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#4E7AC7",
    colorText: "#2D3A5A",
    colorTextSecondary: "#5B6784",
    colorDanger: "#C9668F",
    colorBackground: "#FFFFFF",
    borderRadius: "14px",
    fontFamily: "Inter, system-ui, sans-serif",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": { border: "1.5px solid #E3E8F2", boxShadow: "none" },
    ".Input:focus": { border: "1.5px solid #4E7AC7", boxShadow: "0 0 0 4px #EEF3FB" },
  },
};

const NOT_DELIVERABLE = "On livre seulement en France métropolitaine (Corse comprise) pour le moment.";

/** Vente à l'unité, telle qu'affichée dans la fenêtre d'achat. */
export interface UnitOffer {
  priceCents: number;
  /** Fiches vendables à l'unité (dans l'ordre de pack.items). */
  items: { title: string; icon: IconName }[];
  /** Nombre de fiches du pack complet (fiche bonus comprise). */
  packCount: number;
}

/** Choix des fiches à l'unité, total en direct et rappel du pack complet. */
export function FichePicker({
  unit,
  packCents,
  picked,
  onChange,
  onPickPack,
}: {
  unit: UnitOffer;
  packCents: number;
  picked: number[];
  onChange: (p: number[]) => void;
  onPickPack: () => void;
}) {
  const total = unit.priceCents * picked.length;
  const diff = packCents - total;
  const toggle = (i: number) => onChange(picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i].sort((a, b) => a - b));
  return (
    <div className="fiche-pick">
      <p className="fiche-pick__label">Choisis tes fiches · {formatPrice(unit.priceCents)} l&apos;une</p>
      <div className="fiche-pick__grid" role="group" aria-label="Fiches à l'unité">
        {unit.items.map((item, i) => (
          <button
            key={item.title}
            type="button"
            className={picked.includes(i) ? "fiche-chip fiche-chip--on" : "fiche-chip"}
            aria-pressed={picked.includes(i)}
            onClick={() => toggle(i)}
          >
            <Icon name={picked.includes(i) ? "check" : item.icon} />
            <span>{item.title}</span>
          </button>
        ))}
      </div>
      <p className="fiche-pick__total" aria-live="polite">
        {picked.length ? (
          <>
            {picked.length} fiche{picked.length > 1 ? "s" : ""} · <strong>{formatPrice(total)}</strong>
          </>
        ) : (
          "Touche une fiche pour l'ajouter"
        )}
      </p>
      {picked.length >= 3 ? (
        <div className="fiche-pick__nudge">
          <span>
            <Icon name="gift" />{" "}
            {diff > 0 ? (
              <>
                Pour <strong>{formatPrice(diff)}</strong> de plus : les {unit.items.length} fiches + la fiche bonus.
              </>
            ) : (
              <>
                Le pack complet est moins cher : <strong>{formatPrice(packCents)}</strong> les {unit.packCount} fiches.
              </>
            )}
          </span>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onPickPack}>
            Prendre le pack
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Paiement d'un format : crée la session Stripe à l'ouverture, puis affiche Apple Pay / carte. */
export function CheckoutPanel({
  slug,
  format,
  fiches,
  priceCents,
}: {
  slug: string;
  format: PackFormat;
  /** Achat à l'unité : fiches choisies (indices). */
  fiches: number[] | null;
  priceCents: number;
}) {
  const [failed, setFailed] = useState(false);
  const clientSecretRef = useRef<string | null>(null);
  const [clientSecret, setClientSecret] = useState<Promise<string> | null>(null);
  const [stripe, setStripe] = useState<ReturnType<typeof loadStripe> | null>(null);

  // La session de paiement est créée une seule fois, dans le navigateur, à l'ouverture de la fenêtre.
  useEffect(() => {
    const response = fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pack: slug, format, fiches, source: sourceFromLocation() }),
    })
      .then(async (r) => {
        const data = (await r.json()) as { clientSecret?: string; publishableKey?: string };
        if (!r.ok || !data.clientSecret) throw new Error("checkout");
        clientSecretRef.current = data.clientSecret;
        return { clientSecret: data.clientSecret, publishableKey: data.publishableKey };
      })
      .catch((e) => {
        setFailed(true);
        throw e;
      });
    const promise = response.then((d) => d.clientSecret);
    const stripeInstance = response.then((d) => getStripe(d.publishableKey));
    promise.catch(() => {}); // l'erreur est gérée par l'état « failed »
    stripeInstance.catch(() => {});
    setClientSecret(promise);
    setStripe(stripeInstance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, format]);

  if (failed) return <HostedFallback slug={slug} format={format} fiches={fiches} priceCents={priceCents} />;
  if (!clientSecret || !stripe) return <div className="checkout__loading" aria-label="Chargement du paiement" />;

  return (
    <CheckoutElementsProvider
      stripe={stripe}
      options={{
        clientSecret,
        elementsOptions: { appearance },
        // France par défaut : pas de champ « code postal » à remplir.
        // (Pas d'adresse de livraison par défaut : Stripe exige alors une adresse complète.
        //  La session n'autorise que la France, le pays est donc déjà fixé.)
        defaultValues: { billingAddress: { address: { country: "FR" } } },
      }}
    >
      <CheckoutForm slug={slug} format={format} fiches={fiches} priceCents={priceCents} clientSecretRef={clientSecretRef} />
    </CheckoutElementsProvider>
  );
}

function CheckoutForm({
  slug,
  format,
  fiches,
  priceCents,
  clientSecretRef,
}: {
  slug: string;
  format: PackFormat;
  fiches: number[] | null;
  priceCents: number;
  clientSecretRef: React.RefObject<string | null>;
}) {
  const state = useCheckoutElements();
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const platform = usePlatform();
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);

  const isPrint = format === "papier";
  const session = state.type === "success" ? state.checkout : null;
  const discount = session?.discountAmounts?.[0] ?? null;
  const totalLabel = session ? session.total.total.amount : formatPrice(priceCents);
  // Commande gratuite (code à -100 %) : pas de carte à saisir.
  const isFree = session ? session.total.total.minorUnitsAmount === 0 : false;
  // Offre de lancement : le code est saisi par le client (champ « J'ai un code promo »).
  const isOffer = Boolean(discount?.promotionCode && discount.promotionCode.toUpperCase() === OFFER.code.toUpperCase());
  // Formulaire carte visible : pas d'Apple Pay / Google Pay, commande gratuite, ou choix « Payer par carte ».
  const cardOpen = hasWallet === false || isFree || showCard;

  const applyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !promoCode.trim()) return;
    setPromoBusy(true);
    setPromoError(null);
    const result = await session.applyPromotionCode(promoCode.trim());
    setPromoBusy(false);
    if (result.type === "error") setPromoError("Ce code n'est pas valide.");
    else setPromoOpen(false);
  };

  const recordConsent = async () => {
    const r = await fetch("/api/checkout/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientSecret: clientSecretRef.current }),
    });
    if (!r.ok) throw new Error("consent");
  };

  const requireConsent = () => {
    if (consent) return true;
    setConsentError(true);
    const box = document.getElementById(`consent-${slug}`);
    box?.focus();
    box?.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  };

  const onExpressConfirm = async (event: StripeExpressCheckoutElementConfirmEvent) => {
    if (state.type !== "success") return event.paymentFailed({ reason: "fail" });
    // Outre-mer refusé (l'adresse elle-même reste obligatoire côté Stripe).
    if (isPrint && event.shippingAddress?.address?.postal_code && !isDeliverable(event.shippingAddress.address)) {
      setMessage(NOT_DELIVERABLE);
      return event.paymentFailed({ reason: "address_unserviceable", message: NOT_DELIVERABLE });
    }
    try {
      await recordConsent();
      const result = await state.checkout.confirm({ expressCheckoutConfirmEvent: event });
      if (result.type === "error") setMessage(result.error.message);
    } catch {
      event.paymentFailed({ reason: "fail" });
      setMessage("Le paiement n'a pas pu aboutir. Réessaie ou paie par carte.");
    }
  };

  const onCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.type !== "success" || !requireConsent()) return;
    const shipTo = state.checkout.shippingAddress?.address;
    if (isPrint && shipTo?.postal_code && !isDeliverable(shipTo)) {
      setMessage(NOT_DELIVERABLE);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await recordConsent();
      const result = await state.checkout.confirm({ email });
      // En cas de succès, Stripe redirige vers la page « Merci ».
      if (result.type === "error") setMessage(result.error.message);
    } catch {
      setMessage("Le paiement n'a pas pu aboutir. Vérifie tes informations et réessaie.");
    } finally {
      setBusy(false);
    }
  };

  if (state.type === "error") return <HostedFallback slug={slug} format={format} fiches={fiches} priceCents={priceCents} />;

  const consentBox = (
    <>
      <label className={consentError && !consent ? "consent consent--error" : "consent"}>
        <input
          id={`consent-${slug}`}
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            if (e.target.checked) setConsentError(false);
          }}
        />
        <ConsentText format={format} />
      </label>
      {consentError && !consent ? (
        <p className="checkout__hint" role="alert">
          Coche la case pour continuer
        </p>
      ) : null}
    </>
  );

  const promo = discount ? (
    <p className="promo-applied">
      <span>
        {isOffer ? "Offre de lancement" : <>Code <strong>{discount.promotionCode ?? discount.displayName}</strong></>} : −{discount.amount} · Total{" "}
        <strong>{totalLabel}</strong>
      </span>
      <button type="button" className="link-btn" onClick={() => session?.removePromotionCode()}>
        Retirer
      </button>
    </p>
  ) : promoOpen ? (
    <form className="promo-form" onSubmit={applyPromo}>
      <label htmlFor={`promo-${slug}`} className="visually-hidden">Code promo</label>
      <input
        id={`promo-${slug}`}
        className="input promo-form__input"
        value={promoCode}
        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
        placeholder="Code promo"
        autoComplete="off"
        autoCapitalize="characters"
      />
      <button type="submit" className="btn btn--secondary btn--sm" disabled={promoBusy || !session}>
        {promoBusy ? "…" : "Appliquer"}
      </button>
      {promoError ? <p className="promo-form__error" role="alert">{promoError}</p> : null}
    </form>
  ) : session ? (
    <button type="button" className="checkout__alt" onClick={() => setPromoOpen(true)}>
      J&apos;ai un code promo
    </button>
  ) : null;

  return (
    <div className="checkout checkout--sheet">
      {state.type === "loading" || hasWallet === null ? <div className="checkout__loading" aria-label="Chargement du paiement" /> : null}

      {/* Un seul bouton de paiement rapide, adapté à l'appareil : Apple Pay sur iPhone / iPad / Mac, Google Pay sur Android. */}
      <div className={hasWallet === false || isFree ? "checkout__express checkout__express--empty" : "checkout__express"}>
        {/* Tant que la case n'est pas cochée, un calque intercepte le tap et affiche le rappel
            (le mode Stripe utilisé ne permet pas de bloquer le clic autrement). */}
        {!consent && hasWallet ? (
          <button type="button" className="checkout__guard" aria-label="Coche d'abord la case pour payer avec Apple Pay ou Google Pay" onClick={requireConsent} />
        ) : null}
        {platform ? (
          <ExpressCheckoutElement
            options={{
              buttonHeight: 52,
              buttonType: { applePay: "buy", googlePay: "buy" },
              buttonTheme: { applePay: "black", googlePay: "black" },
              paymentMethodOrder: platform === "android" ? ["google_pay"] : ["apple_pay", "google_pay"],
              paymentMethods: {
                applePay: platform === "apple" ? "always" : platform === "android" ? "never" : "auto",
                googlePay: platform === "android" ? "always" : platform === "apple" ? "never" : "auto",
                link: "never",
                amazonPay: "never",
                paypal: "never",
              },
              layout: { maxColumns: 1, overflow: "never" },
            }}
            onReady={(e) => setHasWallet(Boolean(e.availablePaymentMethods && Object.values(e.availablePaymentMethods).some(Boolean)))}
            onConfirm={onExpressConfirm}
          />
        ) : null}
      </div>

      {!cardOpen ? (
        <>
          {consentBox}
          <button type="button" className="checkout__or" onClick={() => setShowCard(true)}>
            <span>ou payer par carte</span>
          </button>
          {message ? (
            <p className="alert" role="alert">
              {message}
            </p>
          ) : null}
        </>
      ) : hasWallet !== null || isFree ? (
        <form className="checkout__card" onSubmit={onCardSubmit}>
          <label className="checkout__label" htmlFor={`email-${slug}`}>
            Ton email <span>{isPrint ? "(confirmation, suivi et fiches numériques offertes)" : "(pour recevoir tes fiches)"}</span>
          </label>
          <input
            id={`email-${slug}`}
            className="input checkout__email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="prenom@exemple.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {isPrint ? (
            <div className="checkout__shipping">
              <p className="checkout__label">
                Adresse de livraison <span>({SHIPPING.zoneShort}, Corse comprise)</span>
              </p>
              <ShippingAddressElement />
            </div>
          ) : null}
          {isFree ? null : <PaymentElement options={{ layout: "tabs", fields: { billingDetails: { email: "never" } } }} />}
          {consentBox}
          {message ? (
            <p className="alert" role="alert">
              {message}
            </p>
          ) : null}
          <button type="submit" className="btn btn--primary btn--block btn--buy" disabled={busy || state.type !== "success"}>
            {busy ? "Un instant…" : isFree ? (isPrint ? "Commander mes fiches" : "Recevoir mes fiches") : <>Payer {totalLabel}</>}
          </button>
        </form>
      ) : null}

      {promo}
      <p className="checkout__trust">
        <Icon name="shield" /> Paiement sécurisé par Stripe
      </p>
    </div>
  );
}

/** Secours : bouton classique vers la page de paiement Stripe (fonctionne sans JavaScript). */
function HostedFallback({ slug, format, fiches, priceCents }: { slug: string; format: PackFormat; fiches: number[] | null; priceCents: number }) {
  return (
    <form method="post" action="/api/checkout" className="buy-form">
      <input type="hidden" name="pack" value={slug} />
      <input type="hidden" name="format" value={format} />
      {fiches ? <input type="hidden" name="fiches" value={fiches.join(",")} /> : null}
      <SourceField />
      <label className="consent">
        <input type="checkbox" name="consent" required />
        <ConsentText format={format} />
      </label>
      <button type="submit" className="btn btn--primary btn--block btn--buy">
        {format === "papier" ? "Commander mes fiches" : "Payer"} · {formatPrice(priceCents)} <Icon name="arrow" />
      </button>
    </form>
  );
}

type Platform = "apple" | "android" | "other";

/** Détecte la famille d'appareil pour n'afficher que le portefeuille pertinent. */
function usePlatform(): Platform | null {
  const [platform, setPlatform] = useState<Platform | null>(null);
  useEffect(() => {
    const ua = navigator.userAgent;
    const isApple = /iPhone|iPad|iPod|Macintosh|Mac OS X/.test(ua) || (navigator.maxTouchPoints > 1 && /Mac/.test(ua));
    setPlatform(/Android/i.test(ua) ? "android" : isApple ? "apple" : "other");
  }, []);
  return platform;
}

/** Champ caché contenant la provenance de la visite (renseigné dans le navigateur). */
function SourceField() {
  const [src, setSrc] = useState("");
  useEffect(() => setSrc(sourceFromLocation() ?? ""), []);
  return src ? <input type="hidden" name="source" value={src} /> : null;
}

/** Texte de la case à cocher : renonciation à la rétractation pour le numérique seulement. */
function ConsentText({ format }: { format: PackFormat }) {
  return format === "papier" ? (
    <span>
      J&apos;accepte les <Link href="/cgv" target="_blank">CGV</Link>. Numérique envoyé tout de suite ; 14 jours pour te rétracter après réception du papier.
    </span>
  ) : (
    <span>
      J&apos;accepte les <Link href="/cgv" target="_blank">CGV</Link> et renonce à mon droit de rétractation pour recevoir mes
      fiches immédiatement.
    </span>
  );
}

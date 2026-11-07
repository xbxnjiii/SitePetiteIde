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
import type { PackFormat, PrintEdition } from "@/content/packs";
import { SHIPPING, isDeliverable } from "@/content/shipping";
import { sourceFromLocation } from "@/lib/source";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/stripe-public";

// Paiement intégré à la page de vente (Stripe « Elements » + Checkout Sessions) :
//  - Apple Pay / Google Pay s'affichent automatiquement sur les appareils compatibles ;
//  - paiement par carte dans un formulaire sur la page ;
//  - secours : bouton vers la page de paiement hébergée par Stripe si le chargement échoue ;
//  - choix du format : numérique (PDF + images), ou fiches papier (livrées, numérique offert).

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

/** Bloc d'achat : choix du format (si le pack existe en papier), puis paiement. */
export function PackCheckout({ slug, priceCents, print }: { slug: string; priceCents: number; print?: PrintEdition | null }) {
  const [format, setFormat] = useState<PackFormat>("pdf");
  return (
    <>
      {print ? <FormatPicker slug={slug} pdfCents={priceCents} print={print} value={format} onChange={setFormat} /> : null}
      {/* Une session de paiement par format : changer de format recrée la session. */}
      <PackCheckoutSession
        key={format}
        slug={slug}
        format={format}
        priceCents={format === "papier" && print ? print.priceCents : priceCents}
        showPrice={!print}
      />
    </>
  );
}

function FormatPicker({
  slug,
  pdfCents,
  print,
  value,
  onChange,
}: {
  slug: string;
  pdfCents: number;
  print: PrintEdition;
  value: PackFormat;
  onChange: (f: PackFormat) => void;
}) {
  const options: { id: PackFormat; title: string; price: string; note: string; disabled?: boolean }[] = [
    { id: "pdf", title: "Numérique (PDF ou image)", price: formatPrice(pdfCents), note: "Accès immédiat" },
    {
      id: "papier",
      title: "Papier + PDF offert",
      price: formatPrice(print.priceCents),
      note: print.soldOut ? "Bientôt de retour" : `+ ${formatPrice(SHIPPING.priceCents)} de livraison`,
      disabled: print.soldOut,
    },
  ];
  return (
    <fieldset className="formats">
      <legend className="visually-hidden">Choisis ton format</legend>
      <div className="formats__grid">
        {options.map((o) => (
          <label key={o.id} className={["format", value === o.id ? "format--on" : "", o.disabled ? "format--off" : ""].join(" ")}>
            <input
              type="radio"
              name={`format-${slug}`}
              value={o.id}
              checked={value === o.id}
              disabled={o.disabled}
              onChange={() => onChange(o.id)}
            />
            <span className="format__title">
              <Icon name={o.id === "pdf" ? "download" : "gift"} /> {o.title}
            </span>
            <span className="format__price">{o.price}</span>
            <span className="format__note">{o.note}</span>
          </label>
        ))}
      </div>
      {value === "papier" ? (
        <p className="formats__details">
          {print.specs.join(" · ")}. {SHIPPING.dispatch} · {SHIPPING.zoneShort}.
        </p>
      ) : null}
    </fieldset>
  );
}

function PackCheckoutSession({
  slug,
  format,
  priceCents,
  showPrice,
}: {
  slug: string;
  format: PackFormat;
  priceCents: number;
  /** `false` quand le choix du format affiche déjà les prix (le prix n'est alors rappelé qu'en cas de réduction). */
  showPrice: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const clientSecretRef = useRef<string | null>(null);

  const [clientSecret, setClientSecret] = useState<Promise<string> | null>(null);
  const [stripe, setStripe] = useState<ReturnType<typeof loadStripe> | null>(null);

  // La session de paiement est créée une seule fois, dans le navigateur, au chargement du bloc.
  useEffect(() => {
    const response = fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: slug, format, source: sourceFromLocation() }),
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
  }, [slug, format]);

  if (failed)
    return (
      <>
        {showPrice ? <PriceRow priceCents={priceCents} format={format} /> : null}
        <HostedFallback slug={slug} format={format} priceCents={priceCents} />
      </>
    );
  if (!clientSecret || !stripe)
    return (
      <>
        {showPrice ? <PriceRow priceCents={priceCents} format={format} /> : null}
        <div className="checkout__loading" aria-label="Chargement du paiement" />
      </>
    );

  return (
    <CheckoutElementsProvider stripe={stripe} options={{
        clientSecret,
        elementsOptions: { appearance },
        // France par défaut : pas de champ « code postal » à remplir.
        // (Pas d'adresse de livraison par défaut : Stripe exige alors une adresse complète.
        //  La session n'autorise que la France, le pays est donc déjà fixé.)
        defaultValues: { billingAddress: { address: { country: "FR" } } },
      }}>
      <CheckoutForm slug={slug} format={format} priceCents={priceCents} showPrice={showPrice} clientSecretRef={clientSecretRef} />
    </CheckoutElementsProvider>
  );
}

function CheckoutForm({
  slug,
  format,
  priceCents,
  showPrice,
  clientSecretRef,
}: {
  slug: string;
  format: PackFormat;
  priceCents: number;
  showPrice: boolean;
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
  // Prix des fiches après réduction, hors frais de port (affiché à la place du prix barré).
  const itemsAfterDiscount = session
    ? formatPrice(session.total.total.minorUnitsAmount - session.total.shippingRate.minorUnitsAmount)
    : formatPrice(priceCents);
  // Commande gratuite (code à -100 %) : pas de carte à saisir.
  const isFree = session ? session.total.total.minorUnitsAmount === 0 : false;

  // Offre de lancement : le code est saisi par le client (champ « J'ai un code promo »).
  const isOffer = Boolean(discount?.promotionCode && discount.promotionCode.toUpperCase() === OFFER.code.toUpperCase());

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
    document.getElementById(`consent-${showCard ? "modal" : "page"}-${slug}`)?.focus();
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

  if (state.type === "error")
    return (
      <>
        {showPrice ? <PriceRow priceCents={priceCents} format={format} /> : null}
        <HostedFallback slug={slug} format={format} priceCents={priceCents} />
      </>
    );

  const consentBox = (where: "page" | "modal") => (
    <>
      <label className={consentError && !consent ? "consent consent--error" : "consent"}>
        <input
          id={`consent-${where}-${slug}`}
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

  return (
    <div className="checkout">
      {showPrice || discount ? <PriceRow priceCents={priceCents} format={format} discountedLabel={discount ? itemsAfterDiscount : null} /> : null}
      {state.type === "loading" || hasWallet === null ? <div className="checkout__loading" aria-label="Chargement du paiement" /> : null}

      {/* Un seul bouton de paiement rapide, adapté à l'appareil :
          Apple Pay sur iPhone / iPad / Mac, Google Pay sur Android. */}
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

      {/* Sans Apple Pay / Google Pay : bouton principal ; sinon : lien discret. Les deux ouvrent la fenêtre carte. */}
      {hasWallet === false || isFree ? (
        <button type="button" className="btn btn--primary btn--block btn--buy" onClick={() => setShowCard(true)} disabled={state.type !== "success"}>
          {isFree ? (
            <>
              {isPrint ? <Icon name="gift" /> : <Icon name="download" />} {isPrint ? "Commander mes fiches" : "Recevoir mes fiches"}
            </>
          ) : (
            <>
              <Icon name="shield" /> Payer {totalLabel} par carte
            </>
          )}
        </button>
      ) : null}
      {hasWallet && !isFree ? (
        <button type="button" className="checkout__alt" onClick={() => setShowCard(true)}>
          Autres moyens de paiement
        </button>
      ) : null}

      {/* Code promo : appliqué directement sur la session Stripe (Apple Pay / Google Pay compris). */}
      {discount ? (
        <p className="promo-applied">
          <span>
            {isOffer ? "Offre de lancement" : <>Code <strong>{discount.promotionCode ?? discount.displayName}</strong></>} : −
            {discount.amount} · Total <strong>{totalLabel}</strong>
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
      ) : null}

      {consentBox("page")}

      {message && !showCard ? (
        <p className="alert" role="alert">
          {message}
        </p>
      ) : null}

      {showCard ? (
        <CardModal onClose={() => setShowCard(false)} title={isFree ? "Commande gratuite" : `Payer ${totalLabel}`}>
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
                  Adresse de livraison <span>({SHIPPING.zone})</span>
                </p>
                <ShippingAddressElement />
              </div>
            ) : null}
            {isFree ? null : <PaymentElement options={{ layout: "tabs", fields: { billingDetails: { email: "never" } } }} />}
            {consentBox("modal")}
            {message ? (
              <p className="alert" role="alert">
                {message}
              </p>
            ) : null}
            <button type="submit" className="btn btn--primary btn--block btn--buy" disabled={busy || state.type !== "success"}>
              {busy ? "Un instant…" : isFree ? (isPrint ? "Commander mes fiches" : "Recevoir mes fiches") : `Payer ${totalLabel}`}
            </button>
            <p className="checkout__trust">
              <Icon name="shield" /> Paiement sécurisé par Stripe
            </p>
          </form>
        </CardModal>
      ) : null}
    </div>
  );
}

/** Fenêtre (bas d'écran sur mobile, centrée sur ordinateur) pour le paiement par carte. */
function CardModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <div className="modal" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal__head">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Secours : bouton classique vers la page de paiement Stripe (fonctionne sans JavaScript). */
function HostedFallback({ slug, format, priceCents }: { slug: string; format: PackFormat; priceCents: number }) {
  return (
    <form method="post" action="/api/checkout" className="buy-form">
      <input type="hidden" name="pack" value={slug} />
      <input type="hidden" name="format" value={format} />
      <SourceField />
      <label className="consent">
        <input type="checkbox" name="consent" required />
        <ConsentText format={format} />
      </label>
      <button type="submit" className="btn btn--primary btn--block btn--buy">
        {format === "papier" ? "Commander mes fiches" : "Je veux le pack"} · {formatPrice(priceCents)} <Icon name="arrow" />
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

/** Texte de la case à cocher : renonciation à la rétractation pour le PDF seulement. */
function ConsentText({ format }: { format: PackFormat }) {
  return format === "papier" ? (
    <span>
      J&apos;accepte les <Link href="/cgv" target="_blank">CGV</Link>. Le PDF offert est envoyé tout de suite ; tu disposes de 14
      jours à réception des fiches papier pour te rétracter.
    </span>
  ) : (
    <span>
      J&apos;accepte les <Link href="/cgv" target="_blank">CGV</Link> et renonce à mon droit de rétractation pour recevoir mes
      fiches immédiatement.
    </span>
  );
}

/** Prix affiché dans le bloc d'achat ; prix normal barré quand une réduction est appliquée. */
function PriceRow({
  priceCents,
  format,
  discountedLabel = null,
}: {
  priceCents: number;
  format: PackFormat;
  discountedLabel?: string | null;
}) {
  return (
    <div className="sale-buy__price">
      <span>
        <span className="price">{discountedLabel ?? formatPrice(priceCents)}</span>
        {discountedLabel ? (
          <s className="price__old">
            <span className="visually-hidden">au lieu de </span>
            {formatPrice(priceCents)}
          </s>
        ) : null}
      </span>
      {format === "papier" ? (
        <span>+ {formatPrice(SHIPPING.priceCents)} de livraison</span>
      ) : (
        <span className="sale-buy__format">
          <Icon name="download" /> Numérique (PDF ou image)
        </span>
      )}
    </div>
  );
}

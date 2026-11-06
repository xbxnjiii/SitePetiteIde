"use client";
import { loadStripe, type Appearance, type StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import { CheckoutElementsProvider, ExpressCheckoutElement, PaymentElement, useCheckoutElements } from "@stripe/react-stripe-js/checkout";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/format";
import { OFFER, isOfferActive } from "@/content/offer";
import { sourceFromLocation } from "@/lib/source";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/stripe-public";

// Paiement intégré à la page de vente (Stripe « Elements » + Checkout Sessions) :
//  - Apple Pay / Google Pay s'affichent automatiquement sur les appareils compatibles ;
//  - paiement par carte dans un formulaire sur la page ;
//  - secours : bouton vers la page de paiement hébergée par Stripe si le chargement échoue.

let stripePromise: ReturnType<typeof loadStripe> | null = null;
const getStripe = () => (stripePromise ??= loadStripe(STRIPE_PUBLISHABLE_KEY, { locale: "fr" }));

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

export function PackCheckout({ slug, priceCents }: { slug: string; priceCents: number }) {
  const [failed, setFailed] = useState(false);
  const clientSecretRef = useRef<string | null>(null);

  const [clientSecret, setClientSecret] = useState<Promise<string> | null>(null);

  // La session de paiement est créée une seule fois, dans le navigateur, au chargement du bloc.
  useEffect(() => {
    const promise = fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: slug, source: sourceFromLocation() }),
      })
        .then(async (r) => {
          const data = (await r.json()) as { clientSecret?: string };
          if (!r.ok || !data.clientSecret) throw new Error("checkout");
          clientSecretRef.current = data.clientSecret;
          return data.clientSecret;
        })
        .catch((e) => {
          setFailed(true);
          throw e;
        });
    promise.catch(() => {}); // l'erreur est gérée par l'état « failed »
    setClientSecret(promise);
  }, [slug]);

  if (failed)
    return (
      <>
        <PriceRow priceCents={priceCents} />
        <HostedFallback slug={slug} priceCents={priceCents} />
      </>
    );
  if (!clientSecret)
    return (
      <>
        <PriceRow priceCents={priceCents} />
        <div className="checkout__loading" aria-label="Chargement du paiement" />
      </>
    );

  return (
    <CheckoutElementsProvider stripe={getStripe()} options={{
        clientSecret,
        elementsOptions: { appearance },
        // France par défaut : pas de champ « code postal » à remplir.
        defaultValues: { billingAddress: { address: { country: "FR" } } },
      }}>
      <CheckoutForm slug={slug} priceCents={priceCents} clientSecretRef={clientSecretRef} />
    </CheckoutElementsProvider>
  );
}

function CheckoutForm({
  slug,
  priceCents,
  clientSecretRef,
}: {
  slug: string;
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

  const session = state.type === "success" ? state.checkout : null;
  const discount = session?.discountAmounts?.[0] ?? null;
  const totalLabel = session ? session.total.total.amount : formatPrice(priceCents);
  // Commande gratuite (code à -100 %) : pas de carte à saisir.
  const isFree = session ? session.total.total.minorUnitsAmount === 0 : false;

  // Offre de lancement : code appliqué automatiquement (une seule tentative, silencieuse).
  const offerTried = useRef(false);
  useEffect(() => {
    if (!session || offerTried.current || !isOfferActive() || session.discountAmounts?.length) return;
    offerTried.current = true;
    session.applyPromotionCode(OFFER.code).catch(() => {});
  }, [session]);
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
        <PriceRow priceCents={priceCents} />
        <HostedFallback slug={slug} priceCents={priceCents} />
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
        <span>
          J&apos;accepte les <Link href="/cgv" target="_blank">CGV</Link> et renonce à mon droit de rétractation pour recevoir le
          PDF immédiatement.
        </span>
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
      <PriceRow priceCents={priceCents} discountedLabel={discount ? totalLabel : null} />
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
              <Icon name="download" /> Recevoir mes fiches
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
              Ton email <span>(pour recevoir ton PDF)</span>
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
            {isFree ? null : <PaymentElement options={{ layout: "tabs", fields: { billingDetails: { email: "never" } } }} />}
            {consentBox("modal")}
            {message ? (
              <p className="alert" role="alert">
                {message}
              </p>
            ) : null}
            <button type="submit" className="btn btn--primary btn--block btn--buy" disabled={busy || state.type !== "success"}>
              {busy ? "Un instant…" : isFree ? "Recevoir mes fiches" : `Payer ${totalLabel}`}
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
function HostedFallback({ slug, priceCents }: { slug: string; priceCents: number }) {
  return (
    <form method="post" action="/api/checkout" className="buy-form">
      <input type="hidden" name="pack" value={slug} />
      <SourceField />
      <label className="consent">
        <input type="checkbox" name="consent" required />
        <span>
          J&apos;accepte les <Link href="/cgv" target="_blank">CGV</Link> et renonce à mon droit de rétractation pour recevoir le
          PDF immédiatement.
        </span>
      </label>
      <button type="submit" className="btn btn--primary btn--block btn--buy">
        Je veux le pack · {formatPrice(priceCents)} <Icon name="arrow" />
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

/** Prix affiché dans le bloc d'achat ; prix normal barré quand une réduction est appliquée. */
function PriceRow({ priceCents, discountedLabel = null }: { priceCents: number; discountedLabel?: string | null }) {
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
      <span>PDF · accès immédiat</span>
    </div>
  );
}

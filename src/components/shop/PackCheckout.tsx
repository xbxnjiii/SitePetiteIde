"use client";
import { loadStripe, type Appearance, type StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import { CheckoutElementsProvider, ExpressCheckoutElement, PaymentElement, useCheckoutElements } from "@stripe/react-stripe-js/checkout";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/format";
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
        body: JSON.stringify({ pack: slug }),
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

  if (failed) return <HostedFallback slug={slug} priceCents={priceCents} />;
  if (!clientSecret) return <div className="checkout__loading" aria-label="Chargement du paiement" />;

  return (
    <CheckoutElementsProvider stripe={getStripe()} options={{ clientSecret, elementsOptions: { appearance } }}>
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
    document.getElementById(`consent-${slug}`)?.focus();
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

  if (state.type === "error") return <HostedFallback slug={slug} priceCents={priceCents} />;

  return (
    <div className="checkout">
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

      {state.type === "loading" ? <div className="checkout__loading" aria-label="Chargement du paiement" /> : null}

      {/* Un seul bouton de paiement rapide, adapté à l'appareil :
          Apple Pay sur iPhone / iPad / Mac, Google Pay sur Android. */}
      <div className={hasWallet === false ? "checkout__express checkout__express--empty" : "checkout__express"}>
        {/* Tant que la case n'est pas cochée, un calque intercepte le tap et affiche le rappel
            (le mode Stripe utilisé ne permet pas de bloquer le clic autrement). */}
        {!consent && hasWallet ? (
          <button type="button" className="checkout__guard" aria-label="Coche d'abord la case pour payer avec Apple Pay ou Google Pay" onClick={requireConsent} />
        ) : null}
        {platform ? (
        <ExpressCheckoutElement
          options={{
            buttonHeight: 54,
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

      {hasWallet && !showCard ? (
        <button type="button" className="checkout__alt" onClick={() => setShowCard(true)}>
          Autres moyens de paiement
        </button>
      ) : null}

      {hasWallet === false || showCard ? (
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
          <PaymentElement options={{ layout: "tabs", fields: { billingDetails: { email: "never" } } }} />
          <button type="submit" className="btn btn--primary btn--block btn--buy" disabled={busy || state.type !== "success"}>
            {busy ? "Paiement en cours…" : `Payer ${formatPrice(priceCents)}`}
          </button>
        </form>
      ) : null}

      {message ? (
        <p className="alert" role="alert">
          {message}
        </p>
      ) : null}

      <p className="checkout__trust">
        <Icon name="shield" /> Paiement sécurisé · PDF envoyé par email
      </p>
    </div>
  );
}

/** Secours : bouton classique vers la page de paiement Stripe (fonctionne sans JavaScript). */
function HostedFallback({ slug, priceCents }: { slug: string; priceCents: number }) {
  return (
    <form method="post" action="/api/checkout" className="buy-form">
      <input type="hidden" name="pack" value={slug} />
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

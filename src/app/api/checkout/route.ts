import type Stripe from "stripe";
import { canBuyPrint, formatPriceCents, getPack, parseFormat, type Pack, type PackFormat } from "@/content/packs";
import { SHIPPING } from "@/content/shipping";
import { type AppEnv, getEnvAsync, siteUrl } from "@/lib/env";
import { isAllowedOrigin } from "@/lib/origin";
import { cleanSource } from "@/lib/source";
import { isEnabled, priceLookupKey, stripeClient } from "@/lib/stripe";

// POST /api/checkout
//  - JSON  {pack, format}  → paiement intégré à la page (Checkout Session ui_mode "elements") : renvoie le clientSecret.
//  - formulaire    → secours sans JavaScript : redirection vers la page de paiement hébergée par Stripe.
export async function POST(request: Request) {
  const env = await getEnvAsync();
  const base = siteUrl(env);
  const wantsJson = (request.headers.get("content-type") ?? "").includes("application/json");

  // La requête doit venir de notre site (avec ou sans « www », ou en local).
  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin, base)) {
    return new Response("Origine non autorisée", { status: 403 });
  }

  let slug = "";
  let format: PackFormat = "pdf";
  let consent = false;
  let source: string | null = null;
  if (wantsJson) {
    const body = (await request.json().catch(() => null)) as { pack?: unknown; format?: unknown; source?: unknown } | null;
    slug = typeof body?.pack === "string" ? body.pack : "";
    format = parseFormat(body?.format);
    source = cleanSource(body?.source);
  } else {
    const form = await request.formData().catch(() => null);
    slug = String(form?.get("pack") ?? "");
    format = parseFormat(form?.get("format"));
    consent = form?.get("consent") === "on";
    source = cleanSource(form?.get("source"));
  }
  const pack = getPack(slug);
  if (!pack) return wantsJson ? Response.json({ error: "Pack introuvable" }, { status: 404 }) : new Response("Pack introuvable", { status: 404 });
  if (format === "papier" && !canBuyPrint(pack)) {
    return wantsJson ? Response.json({ error: "indisponible" }, { status: 409 }) : Response.redirect(`${base}/${pack.slug}?erreur=indisponible`, 303);
  }

  // Formulaire de secours : la case CGV (+ renonciation pour le PDF) est obligatoire.
  if (!wantsJson && !consent) return Response.redirect(`${base}/${pack.slug}?erreur=cgv`, 303);

  try {
    const session = await createSession(env, base, pack, format, wantsJson ? "elements" : "hosted_page", source);
    if (wantsJson) return Response.json({ clientSecret: session.client_secret, publishableKey: publishableKey(env) });
    return Response.redirect(session.url!, 303);
  } catch (err) {
    const code = err instanceof PriceMismatch ? "prix" : "paiement";
    console.error("checkout:", err instanceof Error ? err.message : err);
    return wantsJson
      ? Response.json({ error: code }, { status: 503 })
      : Response.redirect(`${base}/${pack.slug}?erreur=${code}`, 303);
  }
}

class PriceMismatch extends Error {}

/** Clé publique du Worker ; refusée si elle n'est pas du même mode (test/live) que la clé secrète. */
function publishableKey(env: AppEnv): string | undefined {
  const pk = env.STRIPE_PUBLISHABLE_KEY;
  if (!pk) return undefined;
  const secretIsTest = (env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
  if (secretIsTest !== pk.startsWith("pk_test_")) {
    console.error("checkout: STRIPE_PUBLISHABLE_KEY et STRIPE_SECRET_KEY ne sont pas du même mode (test/live)");
    return undefined;
  }
  return pk;
}

async function createSession(
  env: AppEnv,
  base: string,
  pack: Pack,
  format: PackFormat,
  uiMode: "elements" | "hosted_page",
  source: string | null,
): Promise<Stripe.Checkout.Session> {
  const stripe = stripeClient(env);
  // Le prix vient de Stripe (jamais du navigateur), et doit correspondre au prix affiché.
  const lookupKey = priceLookupKey(pack.slug, format);
  const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const price = data[0];
  if (!price || price.unit_amount !== formatPriceCents(pack, format) || price.currency !== "eur") {
    throw new PriceMismatch(`prix Stripe absent ou différent du prix affiché (${lookupKey}, ${price?.unit_amount})`);
  }
  const isPrint = format === "papier";
  const metadata = { pack: pack.slug, format, provenance: source ?? "direct" };

  const common = {
    mode: "payment" as const,
    line_items: [{ price: price.id, quantity: 1 }],
    // Carte bancaire uniquement : Apple Pay et Google Pay en font partie.
    allowed_payment_method_types: ["card"],
    // Pas de proposition d'enregistrement « Link » : formulaire le plus court possible.
    wallet_options: { link: { display: "never" as const } },
    // Prix toujours en euros (pas de conversion de devise automatique).
    adaptive_pricing: { enabled: false },
    allow_promotion_codes: true,
    automatic_tax: { enabled: isEnabled(env.STRIPE_AUTOMATIC_TAX, false) },
    billing_address_collection: "auto" as const,
    customer_creation: "if_required" as const,
    // « provenance » : réseau d'origine de la visite (?src=tiktok, ?src=insta…), visible dans Stripe.
    // « format » : pdf ou papier (le papier est à expédier, voir /admin).
    metadata,
    payment_intent_data: { metadata, description: isPrint ? `${pack.name} — papier` : pack.name },
    // Papier : adresse de livraison (France uniquement) + frais de port fixes.
    ...(isPrint
      ? {
          shipping_address_collection: { allowed_countries: ["FR" as const] },
          shipping_options: [
            {
              shipping_rate_data: {
                type: "fixed_amount" as const,
                display_name: SHIPPING.name,
                fixed_amount: { amount: SHIPPING.priceCents, currency: "eur" },
                tax_behavior: "inclusive" as const,
                delivery_estimate: {
                  minimum: { unit: "business_day" as const, value: SHIPPING.estimate.min },
                  maximum: { unit: "business_day" as const, value: SHIPPING.estimate.max },
                },
              },
            },
          ],
        }
      : {}),
  };

  if (uiMode === "elements") {
    // Le consentement (CGV, + renonciation à la rétractation pour le PDF) est recueilli sur notre page
    // et enregistré sur la session via /api/checkout/consent avant la confirmation.
    return stripe.checkout.sessions.create({
      ...common,
      ui_mode: "elements",
      return_url: `${base}/merci?session_id={CHECKOUT_SESSION_ID}`,
    });
  }

  // Page Stripe hébergée (secours) : le consentement a été donné sur notre page.
  const at = new Date().toISOString();
  return stripe.checkout.sessions.create({
    ...common,
    locale: "fr",
    metadata: isPrint
      ? { ...common.metadata, cgv_acceptees_le: at }
      : { ...common.metadata, cgv_acceptees_le: at, renonciation_retractation_le: at },
    success_url: `${base}/merci?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/${pack.slug}`,
  });
}

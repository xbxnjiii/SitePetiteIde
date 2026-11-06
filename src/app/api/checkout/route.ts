import type Stripe from "stripe";
import { getPack, type Pack } from "@/content/packs";
import { type AppEnv, getEnvAsync, siteUrl } from "@/lib/env";
import { isAllowedOrigin } from "@/lib/origin";
import { isEnabled, priceLookupKey, stripeClient } from "@/lib/stripe";

// POST /api/checkout
//  - JSON  {pack}  → paiement intégré à la page (Checkout Session ui_mode "elements") : renvoie le clientSecret.
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
  let consent = false;
  if (wantsJson) {
    const body = (await request.json().catch(() => null)) as { pack?: unknown } | null;
    slug = typeof body?.pack === "string" ? body.pack : "";
  } else {
    const form = await request.formData().catch(() => null);
    slug = String(form?.get("pack") ?? "");
    consent = form?.get("consent") === "on";
  }
  const pack = getPack(slug);
  if (!pack) return wantsJson ? Response.json({ error: "Pack introuvable" }, { status: 404 }) : new Response("Pack introuvable", { status: 404 });

  // Formulaire de secours : la case CGV + renonciation est obligatoire.
  if (!wantsJson && !consent) return Response.redirect(`${base}/${pack.slug}?erreur=cgv`, 303);

  try {
    const session = await createSession(env, base, pack, wantsJson ? "elements" : "hosted_page");
    if (wantsJson) return Response.json({ clientSecret: session.client_secret });
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

async function createSession(env: AppEnv, base: string, pack: Pack, uiMode: "elements" | "hosted_page"): Promise<Stripe.Checkout.Session> {
  const stripe = stripeClient(env);
  // Le prix vient de Stripe (jamais du navigateur), et doit correspondre au prix affiché.
  const { data } = await stripe.prices.list({ lookup_keys: [priceLookupKey(pack.slug)], active: true, limit: 1 });
  const price = data[0];
  if (!price || price.unit_amount !== pack.priceCents || price.currency !== "eur") {
    throw new PriceMismatch(`prix Stripe absent ou différent du prix affiché (${pack.slug}, ${price?.unit_amount})`);
  }

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
    metadata: { pack: pack.slug },
    payment_intent_data: { metadata: { pack: pack.slug }, description: pack.name },
  };

  if (uiMode === "elements") {
    // Le consentement (CGV + renonciation à la rétractation) est recueilli sur notre page
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
    metadata: { ...common.metadata, cgv_acceptees_le: at, renonciation_retractation_le: at },
    success_url: `${base}/merci?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/${pack.slug}`,
  });
}

import type Stripe from "stripe";
import { applySettings, getSettings } from "@/lib/settings";
import { canBuyPrint, formatPriceCents, getPack, parseFiches, parseFormat, type Pack, type PackFormat } from "@/content/packs";
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
  let fichesRaw: unknown = null;
  let consent = false;
  let source: string | null = null;
  if (wantsJson) {
    const body = (await request.json().catch(() => null)) as { pack?: unknown; format?: unknown; fiches?: unknown; source?: unknown } | null;
    slug = typeof body?.pack === "string" ? body.pack : "";
    format = parseFormat(body?.format);
    fichesRaw = body?.fiches;
    source = cleanSource(body?.source);
  } else {
    const form = await request.formData().catch(() => null);
    slug = String(form?.get("pack") ?? "");
    format = parseFormat(form?.get("format"));
    fichesRaw = form?.get("fiches");
    consent = form?.get("consent") === "on";
    source = cleanSource(form?.get("source"));
  }
  const found = getPack(slug);
  const pack = found && applySettings(found, await getSettings(env));
  if (!pack) return wantsJson ? Response.json({ error: "Pack introuvable" }, { status: 404 }) : new Response("Pack introuvable", { status: 404 });
  // À l'unité : au moins une fiche valide.
  const fiches = format === "fiches" ? parseFiches(pack, fichesRaw) : null;
  if (format === "fiches" && !fiches) {
    return wantsJson ? Response.json({ error: "fiches" }, { status: 400 }) : Response.redirect(`${base}/${pack.slug}?erreur=fiches`, 303);
  }
  if (format === "papier" && !canBuyPrint(pack)) {
    return wantsJson ? Response.json({ error: "indisponible" }, { status: 409 }) : Response.redirect(`${base}/${pack.slug}?erreur=indisponible`, 303);
  }

  // Formulaire de secours : la case CGV (+ renonciation pour le PDF) est obligatoire.
  if (!wantsJson && !consent) return Response.redirect(`${base}/${pack.slug}?erreur=cgv`, 303);

  try {
    const session = await createSession(env, base, pack, format, fiches, wantsJson ? "elements" : "hosted_page", source);
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

/**
 * Prix Stripe du pack. Si le prix du site (src/content/packs.ts) a changé, un nouveau prix est créé
 * sur le même produit Stripe et récupère la clé du prix (l'ancien est archivé) : pas besoin de passer par Stripe.
 */
async function syncedPrice(
  stripe: Stripe,
  lookupKey: string,
  cents: number,
  info: { name: string; description: string; taxCode: string; metadata: Record<string, string> },
): Promise<Stripe.Price> {
  const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const current = data[0];
  if (current && current.unit_amount === cents && current.currency === "eur") return current;
  if (!current) {
    // Nouveau format vendu (ex. fiches à l'unité) : produit + prix créés dans Stripe au premier achat.
    const productId = `lpi-${lookupKey}`;
    await stripe.products.retrieve(productId).catch(() =>
      stripe.products.create(
        { id: productId, name: info.name, description: info.description, tax_code: info.taxCode, metadata: info.metadata },
        { idempotencyKey: `produit-${productId}` },
      ),
    );
    const created = await stripe.prices.create(
      { product: productId, currency: "eur", unit_amount: cents, tax_behavior: "inclusive", lookup_key: lookupKey, transfer_lookup_key: true, metadata: info.metadata },
      { idempotencyKey: `prix-${lookupKey}-${cents}` },
    );
    console.log("checkout: prix Stripe créé", lookupKey, cents);
    return created;
  }
  const product = typeof current.product === "string" ? current.product : current.product.id;
  const next = await stripe.prices.create(
    {
      product,
      currency: "eur",
      unit_amount: cents,
      tax_behavior: current.tax_behavior ?? "inclusive",
      lookup_key: lookupKey,
      transfer_lookup_key: true,
      metadata: current.metadata,
    },
    // Une seule création même si plusieurs clientes paient au même moment.
    { idempotencyKey: `prix-${lookupKey}-${cents}` },
  );
  await stripe.prices.update(current.id, { active: false }).catch(() => {});
  console.log("checkout: nouveau prix Stripe", lookupKey, current.unit_amount, "→", cents);
  return next;
}

async function createSession(
  env: AppEnv,
  base: string,
  pack: Pack,
  format: PackFormat,
  fiches: number[] | null,
  uiMode: "elements" | "hosted_page",
  source: string | null,
): Promise<Stripe.Checkout.Session> {
  const stripe = stripeClient(env);
  // Le prix vient de Stripe (jamais du navigateur), et doit correspondre au prix affiché.
  const lookupKey = priceLookupKey(pack.slug, format);
  const price = await syncedPrice(stripe, lookupKey, formatPriceCents(pack, format), {
    name: format === "fiches" ? `${pack.name} — fiche à l'unité` : format === "papier" ? `${pack.name} — fiches papier` : pack.name,
    description: format === "fiches" ? "Une fiche numérique (PDF et image) au choix." : pack.tagline,
    taxCode: format === "papier" ? "txcd_99999999" : "txcd_10000000",
    metadata: { slug: pack.slug, format },
  });
  const isPrint = format === "papier";
  // « fiches » : indices des fiches achetées à l'unité (dans pack.items), ex. « 0,2,5 ».
  const metadata = { pack: pack.slug, format, provenance: source ?? "direct", ...(fiches ? { fiches: fiches.join(",") } : {}) };
  const description =
    format === "papier" ? `${pack.name} — papier` : fiches ? `${pack.name} — ${fiches.map((i) => pack.items[i].title).join(", ")}` : pack.name;

  const common = {
    mode: "payment" as const,
    line_items: [{ price: price.id, quantity: fiches?.length ?? 1 }],
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
    payment_intent_data: { metadata, description: description.slice(0, 1000) },
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

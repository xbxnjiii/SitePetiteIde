import type Stripe from "stripe";
import { applySettings, getSettings } from "@/lib/settings";
import { getPack, type Pack } from "@/content/packs";
import { type RelayPoint, type ShippingMethod, cleanRelayPoint, getShippingMethod, isShippingFree, methodName, shippingCents } from "@/content/shipping";
import { type CartLine, cleanCart, encodeCart, linePriceCents } from "@/lib/cart";
import { type AppEnv, getEnvAsync, siteUrl } from "@/lib/env";
import { isAllowedOrigin } from "@/lib/origin";
import { availableMethods } from "@/lib/relay";
import { cleanSource } from "@/lib/source";
import { isEnabled, priceLookupKey, stripeClient } from "@/lib/stripe";

// POST /api/checkout — paiement du panier (un ou plusieurs packs, numérique, fiches à l'unité, fiches papier).
//  - JSON  {panier: CartLine[], livraison?, relais?, source?} → paiement intégré (Checkout Session ui_mode "elements") : renvoie le clientSecret.
//  - formulaire {panier (JSON), livraison, relais, consent} → secours sans JavaScript : page de paiement hébergée par Stripe.
//  - ancien format {pack, format, fiches} accepté (un seul article).
export async function POST(request: Request) {
  const env = await getEnvAsync();
  const base = siteUrl(env);
  const wantsJson = (request.headers.get("content-type") ?? "").includes("application/json");

  // La requête doit venir de notre site (avec ou sans « www », ou en local).
  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin, base)) {
    return new Response("Origine non autorisée", { status: 403 });
  }

  const json = (v: unknown) => {
    if (typeof v !== "string" || !v) return null;
    try {
      return JSON.parse(v) as unknown;
    } catch {
      return null;
    }
  };
  let cartRaw: unknown = null;
  let consent = false;
  let source: string | null = null;
  let methodRaw: unknown = null;
  let relayRaw: unknown = null;
  if (wantsJson) {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    cartRaw = body?.panier ?? (body?.pack ? [{ pack: body.pack, format: body.format, fiches: body.fiches, qty: 1 }] : null);
    source = cleanSource(body?.source);
    methodRaw = body?.livraison;
    relayRaw = body?.relais;
  } else {
    const form = await request.formData().catch(() => null);
    cartRaw = json(form?.get("panier"));
    consent = form?.get("consent") === "on";
    source = cleanSource(form?.get("source"));
    methodRaw = form?.get("livraison");
    relayRaw = json(form?.get("relais"));
  }
  const fail = (code: string, status: number) =>
    wantsJson ? Response.json({ error: code }, { status }) : Response.redirect(`${base}/panier?erreur=${code}`, 303);

  // Packs tels qu'ils sont vendus en ce moment (papier et unité activables depuis /admin).
  const settings = await getSettings(env);
  const live = (slug: string) => {
    const p = getPack(slug);
    return p ? applySettings(p, settings) : null;
  };
  const lines = cleanCart(cartRaw, live);
  if (!lines.length) return fail("panier", 400);
  const hasPrint = lines.some((l) => l.format === "papier");

  // Papier : mode de livraison proposé en ce moment, et point relais choisi sur la carte du transporteur.
  let shipping: { method: ShippingMethod; relay: RelayPoint | null } | null = null;
  if (hasPrint) {
    const method = getShippingMethod(methodRaw);
    const relay = method?.relay ? cleanRelayPoint(relayRaw) : null;
    if (!method || !availableMethods(env).some((m) => m.id === method.id) || (method.relay && !relay)) return fail("livraison", 400);
    shipping = { method, relay };
  }

  // Formulaire de secours : la case CGV (+ renonciation pour le numérique) est obligatoire.
  if (!wantsJson && !consent) return Response.redirect(`${base}/panier?erreur=cgv`, 303);

  try {
    const session = await createSession(env, base, lines, live, shipping, wantsJson ? "elements" : "hosted_page", source);
    if (wantsJson) return Response.json({ clientSecret: session.client_secret, publishableKey: publishableKey(env) });
    return Response.redirect(session.url!, 303);
  } catch (err) {
    const code = err instanceof PriceMismatch ? "prix" : "paiement";
    console.error("checkout:", err instanceof Error ? err.message : err);
    return fail(code, 503);
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
  lines: CartLine[],
  live: (slug: string) => Pack | null,
  shipping: { method: ShippingMethod; relay: RelayPoint | null } | null,
  uiMode: "elements" | "hosted_page",
  source: string | null,
): Promise<Stripe.Checkout.Session> {
  const stripe = stripeClient(env);
  // Prix venant de Stripe (jamais du navigateur), synchronisés avec les prix affichés.
  const items = await Promise.all(
    lines.map(async (line) => {
      const pack = live(line.pack)!;
      const { format } = line;
      const price = await syncedPrice(stripe, priceLookupKey(pack.slug, format), linePriceCents(pack, { ...line, qty: 1, fiches: line.fiches?.slice(0, 1) }), {
        name: format === "fiches" ? `${pack.name} — fiche à l'unité` : format === "papier" ? `${pack.name} — fiches papier` : pack.name,
        description: format === "fiches" ? "Une fiche numérique (PDF et image) au choix." : pack.tagline,
        taxCode: format === "papier" ? "txcd_99999999" : "txcd_10000000",
        metadata: { slug: pack.slug, format },
      });
      return { pack, line, price };
    }),
  );
  const subtotal = items.reduce((sum, { pack, line }) => sum + linePriceCents(pack, line), 0);
  const isPrint = Boolean(shipping);
  const hasDigital = lines.some((l) => l.format !== "papier");
  const relay = shipping?.relay;
  const first = items[0];

  const describe = ({ pack, line }: (typeof items)[number]) =>
    line.format === "papier"
      ? `${pack.name} — papier${line.qty > 1 ? ` ×${line.qty}` : ""}`
      : line.format === "fiches"
        ? `${pack.name} — ${(line.fiches ?? []).map((i) => pack.items[i].title).join(", ")}`
        : pack.name;
  const description = items.map(describe).join(" + ");

  const metadata = {
    // « pack » / « format » : premier pack, et « papier » s'il y a des fiches à expédier (admin, statistiques).
    pack: first.pack.slug,
    format: isPrint ? "papier" : lines.every((l) => l.format === "fiches") ? "fiches" : "pdf",
    ...(lines.length === 1 && first.line.format === "fiches" ? { fiches: (first.line.fiches ?? []).join(",") } : {}),
    // Contenu complet du panier (voir src/lib/cart.ts).
    panier: encodeCart(lines),
    ...(hasDigital ? { numerique: "1" } : {}),
    provenance: source ?? "direct",
    // Papier : mode de livraison et point relais (à reporter sur l'étiquette du transporteur).
    ...(shipping ? { livraison: shipping.method.id } : {}),
    ...(relay
      ? {
          relais_id: relay.id,
          relais_nom: relay.name,
          relais_adresse: relay.address,
          relais_cp: relay.postalCode,
          relais_ville: relay.city,
          ...(relay.type ? { relais_type: relay.type } : {}),
        }
      : {}),
  };

  const shipCents = shipping ? shippingCents(shipping.method, subtotal) : 0;
  const shipName = shipping
    ? `${isShippingFree(shipping.method, subtotal) ? "Livraison offerte · " : ""}${methodName(shipping.method)}${relay ? ` · ${relay.name}` : ""}`.slice(0, 100)
    : "";

  const common = {
    mode: "payment" as const,
    line_items: items.map(({ line, price }) => ({ price: price.id, quantity: line.format === "fiches" ? (line.fiches?.length ?? 1) : line.qty })),
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
    metadata,
    payment_intent_data: { metadata, description: description.slice(0, 1000) },
    // Papier : frais de port du mode choisi (offerts dès le seuil chez Mondial Relay) ;
    // adresse (France uniquement) seulement pour la livraison à domicile.
    ...(shipping
      ? {
          ...(shipping.method.relay ? {} : { shipping_address_collection: { allowed_countries: ["FR" as const] } }),
          shipping_options: [
            {
              shipping_rate_data: {
                type: "fixed_amount" as const,
                display_name: shipName,
                fixed_amount: { amount: shipCents, currency: "eur" },
                tax_behavior: "inclusive" as const,
                metadata: { livraison: shipping.method.id },
                delivery_estimate: {
                  minimum: { unit: "business_day" as const, value: shipping.method.estimate.min },
                  maximum: { unit: "business_day" as const, value: shipping.method.estimate.max },
                },
              },
            },
          ],
        }
      : {}),
  };

  if (uiMode === "elements") {
    // Le consentement (CGV, + renonciation à la rétractation pour le numérique) est recueilli sur notre page
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
    // Papier : téléphone pour le transporteur (sur notre page, il est demandé avant le paiement).
    ...(isPrint ? { phone_number_collection: { enabled: true } } : {}),
    metadata: { ...metadata, cgv_acceptees_le: at, ...(hasDigital ? { renonciation_retractation_le: at } : {}) },
    success_url: `${base}/merci?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/panier`,
  });
}


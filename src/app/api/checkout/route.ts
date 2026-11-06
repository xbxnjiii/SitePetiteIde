import { getPack } from "@/content/packs";
import { getEnvAsync, siteUrl } from "@/lib/env";
import { isEnabled, priceLookupKey, stripeClient } from "@/lib/stripe";

// POST /api/checkout (formulaire du bouton « Acheter ») → redirection vers Stripe Checkout.
// Fonctionne sans JavaScript côté navigateur.
export async function POST(request: Request) {
  const env = await getEnvAsync();
  const base = siteUrl(env);

  // Le formulaire doit venir de notre site (avec ou sans « www », ou en local).
  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin, base)) {
    return new Response("Origine non autorisée", { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const pack = getPack(String(form?.get("pack") ?? ""));
  if (!pack) return new Response("Pack introuvable", { status: 404 });

  try {
    const stripe = stripeClient(env);
    // Le prix vient de Stripe (jamais du navigateur), et doit correspondre au prix affiché.
    const { data } = await stripe.prices.list({ lookup_keys: [priceLookupKey(pack.slug)], active: true, limit: 1 });
    const price = data[0];
    if (!price || price.unit_amount !== pack.priceCents || price.currency !== "eur") {
      console.error("checkout: prix Stripe absent ou différent du prix affiché", pack.slug, price?.unit_amount);
      return Response.redirect(`${base}/${pack.slug}?erreur=prix`, 303);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: price.id, quantity: 1 }],
      locale: "fr",
      allow_promotion_codes: true,
      // Prix toujours affiché et payé en euros (pas de conversion de devise automatique).
      adaptive_pricing: { enabled: false },
      // Carte bancaire uniquement : Apple Pay et Google Pay en font partie et s'affichent
      // automatiquement sur les appareils compatibles. Pas de moyens de paiement superflus.
      allowed_payment_method_types: ["card"],
      automatic_tax: { enabled: isEnabled(env.STRIPE_AUTOMATIC_TAX, false) },
      billing_address_collection: "auto",
      customer_creation: "if_required",
      ...(isEnabled(env.STRIPE_TOS_CONSENT, true)
        ? {
            consent_collection: { terms_of_service: "required" as const },
            custom_text: {
              terms_of_service_acceptance: {
                message: `J'accepte les [CGV](${base}/cgv) et je demande l'accès immédiat au contenu numérique : je reconnais renoncer à mon droit de rétractation.`,
              },
            },
          }
        : {}),
      metadata: { pack: pack.slug },
      payment_intent_data: { metadata: { pack: pack.slug }, description: pack.name },
      success_url: `${base}/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/${pack.slug}`,
    });
    return Response.redirect(session.url!, 303);
  } catch (err) {
    console.error("checkout: erreur Stripe", err instanceof Error ? err.message : err);
    return Response.redirect(`${base}/${pack.slug}?erreur=paiement`, 303);
  }
}

function isAllowedOrigin(origin: string, base: string): boolean {
  try {
    const o = new URL(origin);
    if (o.hostname === "localhost" || o.hostname === "127.0.0.1") return true;
    const strip = (h: string) => h.replace(/^www\./, "");
    return o.protocol === "https:" && strip(o.hostname) === strip(new URL(base).hostname);
  } catch {
    return false;
  }
}

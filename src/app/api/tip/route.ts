import { getEnvAsync, siteUrl } from "@/lib/env";
import { isAllowedOrigin } from "@/lib/origin";
import { cleanSource } from "@/lib/source";
import { stripeClient } from "@/lib/stripe";

// POST /api/tip (formulaire) : soutien volontaire à La Petite IDE (1, 2 ou 5 €), sans contrepartie.
// Redirige vers la page de paiement Stripe ; aucun fichier n'est livré.
const AMOUNTS = [100, 200, 500];

export async function POST(request: Request) {
  const env = await getEnvAsync();
  const base = siteUrl(env);
  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin, base)) return new Response("Origine non autorisée", { status: 403 });

  const form = await request.formData().catch(() => null);
  const amount = Number(form?.get("amount"));
  if (!AMOUNTS.includes(amount)) return Response.redirect(`${base}/`, 303);
  const source = cleanSource(form?.get("source")) ?? "direct";

  try {
    const session = await stripeClient(env).checkout.sessions.create({
      mode: "payment",
      locale: "fr",
      allowed_payment_method_types: ["card"],
      adaptive_pricing: { enabled: false },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: amount,
            tax_behavior: "inclusive",
            product_data: { name: "Soutien à La Petite IDE 💙", description: "Merci de soutenir la création de nouvelles fiches !" },
          },
        },
      ],
      submit_type: "donate",
      metadata: { kind: "tip", provenance: source },
      payment_intent_data: { metadata: { kind: "tip", provenance: source }, description: "Soutien à La Petite IDE" },
      success_url: `${base}/merci-soutien`,
      cancel_url: `${base}/`,
    });
    return Response.redirect(session.url!, 303);
  } catch (err) {
    console.error("tip:", err instanceof Error ? err.message : err);
    return Response.redirect(`${base}/`, 303);
  }
}

import Stripe from "stripe";
import { sendOrderEmail } from "@/lib/email";
import { getEnvAsync, requireVar } from "@/lib/env";
import { downloadLinks, getOrder, imagesLink, orderReference } from "@/lib/orders";
import { stripeClient } from "@/lib/stripe";

// Webhook Stripe : SEULE source de confirmation du paiement pour l'envoi de l'email.
// Événements à activer dans Stripe : checkout.session.completed,
// checkout.session.async_payment_succeeded.
const SENT_FLAG = "lpi_email_sent_at";

export async function POST(request: Request) {
  const env = await getEnvAsync();
  const stripe = stripeClient(env);

  // 1. Vérification de la signature sur le corps brut.
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      request.headers.get("stripe-signature") ?? "",
      requireVar(env, "STRIPE_WEBHOOK_SECRET"),
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    console.warn("webhook: signature invalide", err instanceof Error ? err.message : err);
    return new Response("Signature invalide", { status: 400 });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return Response.json({ received: true, ignored: event.type });
  }

  // 2. On relit la session chez Stripe (état à jour) plutôt que de se fier au contenu de l'événement.
  const order = await getOrder(stripe, (event.data.object as Stripe.Checkout.Session).id);
  if (!order) return new Response("Session introuvable", { status: 500 }); // Stripe réessaiera
  if (!order.paid) return Response.json({ received: true, status: "paiement en attente" });
  // Soutien volontaire : rien à livrer (le reçu est envoyé par Stripe).
  if (order.session.metadata?.kind === "tip") {
    console.log("webhook: soutien reçu", order.session.amount_total);
    return Response.json({ received: true, status: "soutien" });
  }
  if (!order.pack) {
    console.error("webhook: pack inconnu", order.session.metadata);
    return Response.json({ received: true, status: "pack inconnu" });
  }
  if (!order.email) {
    console.error("webhook: aucun email client", order.session.id);
    return Response.json({ received: true, status: "email manquant" });
  }

  // 3. Idempotence : ne jamais envoyer deux fois l'email pour un même paiement.
  const pi = order.session.payment_intent as Stripe.PaymentIntent | null;
  if (pi?.metadata?.[SENT_FLAG]) return Response.json({ received: true, status: "déjà envoyé" });

  // 4. Envoi de l'email de livraison (en cas d'échec : 500 ⇒ Stripe réessaie plus tard).
  try {
    await sendOrderEmail(env, {
      to: order.email,
      packName: order.pack.name,
      amountCents: order.session.amount_total ?? 0,
      reference: orderReference(order.session.id),
      links: await downloadLinks(env, order),
      imagesUrl: await imagesLink(env, order),
      expiresAt: order.expiresAt,
      idempotencyKey: `order-email-${order.session.id}`,
    });
  } catch (err) {
    console.error("webhook: échec de l'envoi de l'email", err instanceof Error ? err.message : err);
    return new Response("Échec de l'envoi de l'email", { status: 500 });
  }

  if (pi) {
    await stripe.paymentIntents.update(pi.id, { metadata: { [SENT_FLAG]: new Date().toISOString() } }).catch((err) =>
      console.warn("webhook: marquage de l'envoi impossible", err instanceof Error ? err.message : err),
    );
  }
  console.log("webhook: commande livrée", orderReference(order.session.id), order.pack.slug);
  return Response.json({ received: true, status: "email envoyé" });
}

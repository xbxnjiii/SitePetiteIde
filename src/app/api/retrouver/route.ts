import { sendRecoveryEmail, type RecoveryItem } from "@/lib/email";
import { getEnvAsync, siteUrl } from "@/lib/env";
import { downloadLinks, getOrder, orderReference } from "@/lib/orders";
import { isAllowedOrigin } from "@/lib/origin";
import { stripeClient } from "@/lib/stripe";

// POST /api/retrouver {email}
// Renvoie par email de nouveaux liens (7 jours) pour les commandes payées de cette adresse.
// La réponse est toujours la même, qu'il existe un achat ou non (on ne révèle pas qui a acheté).
const RELINK_DAYS = 7;

export async function POST(request: Request) {
  const env = await getEnvAsync();
  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin, siteUrl(env))) return new Response("Origine non autorisée", { status: 403 });

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "email" }, { status: 400 });

  try {
    const stripe = stripeClient(env);
    const { data } = await stripe.checkout.sessions.list({ customer_details: { email }, status: "complete", limit: 20 });
    const expiresAt = Math.floor(Date.now() / 1000) + RELINK_DAYS * 24 * 3600;
    const items: RecoveryItem[] = [];
    for (const s of data) {
      const order = await getOrder(stripe, s.id);
      if (!order?.paid || order.revoked || !order.pack) continue;
      const links = await downloadLinks(env, order, Math.max(expiresAt, order.expiresAt));
      for (const l of links) items.push({ packName: order.pack.name, reference: orderReference(s.id), url: l.url });
    }
    if (items.length) {
      // Au plus un email par heure et par adresse (clé d'idempotence Resend).
      const hour = Math.floor(Date.now() / 3_600_000);
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
      const key = Array.from(new Uint8Array(digest).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
      await sendRecoveryEmail(env, email, items, expiresAt, `recover-${key}-${hour}`);
      console.log("retrouver: liens renvoyés", items.length);
    }
  } catch (err) {
    console.error("retrouver:", err instanceof Error ? err.message : err);
  }
  return Response.json({ ok: true });
}

import { getEnvAsync, siteUrl } from "@/lib/env";
import { stripeClient } from "@/lib/stripe";
import { isAllowedOrigin } from "@/lib/origin";

// POST /api/checkout/consent {clientSecret}
// Enregistre sur la Checkout Session (avant paiement) que l'acheteur a coché :
// « J'accepte les CGV, je demande l'accès immédiat et je renonce à mon droit de rétractation ».
export async function POST(request: Request) {
  const env = await getEnvAsync();
  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin, siteUrl(env))) return new Response("Origine non autorisée", { status: 403 });

  const body = (await request.json().catch(() => null)) as { clientSecret?: unknown } | null;
  const secret = typeof body?.clientSecret === "string" ? body.clientSecret : "";
  // Le client secret est de la forme cs_xxx_secret_yyy : l'identifiant de session est avant « _secret_ ».
  const sessionId = secret.split("_secret_")[0];
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) return Response.json({ error: "session" }, { status: 400 });

  const stripe = stripeClient(env);
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    // On n'accepte que le secret exact de cette session (preuve que l'appel vient du navigateur de l'acheteur).
    if (session.client_secret !== secret || session.status !== "open") return Response.json({ error: "session" }, { status: 400 });
    const at = new Date().toISOString();
    await stripe.checkout.sessions.update(sessionId, {
      metadata: { ...session.metadata, cgv_acceptees_le: at, renonciation_retractation_le: at },
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("consent:", err instanceof Error ? err.message : err);
    return Response.json({ error: "stripe" }, { status: 503 });
  }
}

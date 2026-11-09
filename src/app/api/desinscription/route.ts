import { cancelEmail } from "@/lib/email";
import { getEnvAsync, requireVar, siteUrl } from "@/lib/env";
import { verifyToken } from "@/lib/signed";

// Désinscription en un clic : annule les emails encore programmés de la séquence du quiz.
// GET  : lien dans l'email → page de confirmation.
// POST : désinscription « one-click » des messageries (en-tête List-Unsubscribe-Post).

async function unsubscribe(request: Request) {
  const env = await getEnvAsync();
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const data = await verifyToken<{ ids?: unknown }>(token, requireVar(env, "DOWNLOAD_TOKEN_SECRET"), "unsub");
  if (!data) return { env, ok: false };
  const ids = Array.isArray(data.ids) ? data.ids.filter((x): x is string => typeof x === "string" && /^[\w-]{8,64}$/.test(x)) : [];
  await Promise.all(ids.map((id) => cancelEmail(env, id)));
  console.log("desinscription:", ids.length, "envoi(s) annulé(s)");
  return { env, ok: true };
}

export async function GET(request: Request) {
  const { env, ok } = await unsubscribe(request);
  return Response.redirect(`${siteUrl(env)}/desinscription${ok ? "" : "?erreur=1"}`, 303);
}

export async function POST(request: Request) {
  const { ok } = await unsubscribe(request);
  return new Response(ok ? "OK" : "Lien invalide", { status: ok ? 200 : 400 });
}

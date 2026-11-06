import { verifyDownloadToken } from "@/lib/download-token";
import { getEnvAsync, requireVar, siteUrl } from "@/lib/env";
import { getOrder } from "@/lib/orders";
import { stripeClient } from "@/lib/stripe";

// GET /telecharger?t=<jeton signé>
// Vérifie le jeton, revérifie le paiement chez Stripe, puis transmet le PDF
// depuis le bucket R2 privé. Le fichier n'a jamais d'adresse publique.
export async function GET(request: Request) {
  const env = await getEnvAsync();
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const fail = (reason: string) => Response.redirect(`${siteUrl(env)}/telechargement-impossible?raison=${reason}`, 303);

  const claims = await verifyDownloadToken(token, requireVar(env, "DOWNLOAD_TOKEN_SECRET"));
  if (!claims) return fail("lien");

  const order = await getOrder(stripeClient(env), claims.s);
  if (!order || !order.paid || !order.pack) return fail("commande");
  if (order.revoked) return fail("rembourse");

  const file = order.pack.files[claims.f];
  const object = file ? await env.PDF_BUCKET?.get(file.key) : null;
  if (!file || !object) {
    console.error("telecharger: fichier introuvable dans R2", file?.key);
    return fail("fichier");
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(object.size),
      "Content-Disposition": `attachment; filename="${file.downloadName}"; filename*=UTF-8''${encodeURIComponent(file.downloadName)}`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

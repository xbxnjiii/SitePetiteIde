import { verifyDownloadToken } from "@/lib/download-token";
import { getEnvAsync, requireVar, siteUrl } from "@/lib/env";
import { allowedImages, getOrder } from "@/lib/orders";
import { stripeClient } from "@/lib/stripe";

// GET /telecharger?t=<jeton signé>[&dl=1]
// Vérifie le jeton, revérifie le paiement chez Stripe, puis transmet le fichier (PDF ou image)
// depuis le bucket R2 privé. Le fichier n'a jamais d'adresse publique.
// Les images s'affichent dans le navigateur (appui long ⇒ « Enregistrer dans Photos ») ; &dl=1 force le téléchargement.
export async function GET(request: Request) {
  const env = await getEnvAsync();
  const url = new URL(request.url);
  const token = url.searchParams.get("t") ?? "";
  const fail = (reason: string) => Response.redirect(`${siteUrl(env)}/telechargement-impossible?raison=${reason}`, 303);

  const claims = await verifyDownloadToken(token, requireVar(env, "DOWNLOAD_TOKEN_SECRET"));
  if (!claims || claims.t === "gal") return fail("lien");
  const isImage = claims.t === "img";
  const isFiche = claims.t === "fiche";

  const order = await getOrder(stripeClient(env), claims.s);
  if (!order || !order.paid || !order.pack) return fail("commande");
  if (order.revoked) return fail("rembourse");

  // Un achat à l'unité ne donne accès qu'aux fiches achetées ; le PDF du pack complet lui est refusé.
  if (order.format === "fiches" && !isImage && !isFiche) return fail("lien");
  if (isFiche && !order.fiches?.includes(claims.f)) return fail("lien");
  if (isImage && !allowedImages(order).includes(claims.f)) return fail("lien");
  const file = isImage ? order.pack.imageFiles?.[claims.f] : isFiche ? order.pack.unit?.files[claims.f] : order.pack.files[claims.f];
  const object = file ? await env.PDF_BUCKET?.get(file.key) : null;
  if (!file || !object) {
    console.error("telecharger: fichier introuvable dans R2", file?.key);
    return fail("fichier");
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": contentType(file.key),
      "Content-Length": String(object.size),
      "Content-Disposition": `${isImage && url.searchParams.get("dl") !== "1" ? "inline" : "attachment"}; filename="${file.downloadName}"; filename*=UTF-8''${encodeURIComponent(file.downloadName)}`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

function contentType(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "application/pdf";
}

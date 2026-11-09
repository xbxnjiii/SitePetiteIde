import { FREE_SHEET } from "@/content/lead";
import { getEnvAsync, requireVar, siteUrl } from "@/lib/env";
import { verifyToken } from "@/lib/signed";

// GET /fiche-gratuite?t=<jeton signé> : fiche gratuite (lien reçu par email après le quiz).
export async function GET(request: Request) {
  const env = await getEnvAsync();
  const fail = (r: string) => Response.redirect(`${siteUrl(env)}/telechargement-impossible?raison=${r}`, 303);
  const token = new URL(request.url).searchParams.get("t") ?? "";
  if (!(await verifyToken(token, requireVar(env, "DOWNLOAD_TOKEN_SECRET"), "free"))) return fail("lien");
  const object = await env.PDF_BUCKET?.get(FREE_SHEET.key);
  if (!object) {
    console.error("fiche-gratuite: fichier absent de R2", FREE_SHEET.key);
    return fail("fichier");
  }
  return new Response(object.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(object.size),
      "Content-Disposition": `attachment; filename="${FREE_SHEET.downloadName}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

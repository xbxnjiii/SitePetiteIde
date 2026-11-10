import { getEnvAsync } from "@/lib/env";
import { IS_PREPROD } from "@/lib/format";
import { LOCK_COOKIE, LOCK_DAYS, lockToken } from "@/lib/preprod-lock";

// POST /api/verrou {password, next} : déverrouille la préprod (cookie de 30 jours).
export async function POST(request: Request) {
  const env = await getEnvAsync();
  const url = new URL(request.url);
  const form = await request.formData().catch(() => null);
  const next = String(form?.get("next") ?? "/");
  const back = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const pwd = env.PREPROD_PASSWORD;
  if (!IS_PREPROD || !pwd) return Response.redirect(new URL(back, url), 303);

  const given = String(form?.get("password") ?? "");
  // Petite pause : freine les essais de mots de passe en série.
  await new Promise((r) => setTimeout(r, 400));
  if (given !== pwd) return Response.redirect(new URL(`${back}${back.includes("?") ? "&" : "?"}verrou=erreur`, url), 303);

  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL(back, url).toString(),
      "Set-Cookie": `${LOCK_COOKIE}=${await lockToken(pwd)}; Path=/; Max-Age=${LOCK_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}

import { getEnvAsync, siteUrl } from "@/lib/env";
import { isAllowedOrigin } from "@/lib/origin";

// POST /api/livraison/colissimo → { token }
// Jeton (valable 30 min) de la carte des points retrait Colissimo. Colissimo impose de l'obtenir
// côté serveur avec la clé d'API de l'espace Colissimo Entreprise (jamais envoyée au navigateur).

let cached: { token: string; until: number } | null = null;

export async function POST(request: Request) {
  const env = await getEnvAsync();
  const origin = request.headers.get("origin");
  if (!origin || !isAllowedOrigin(origin, siteUrl(env))) return new Response("Origine non autorisée", { status: 403 });
  if (!env.COLISSIMO_API_KEY) return Response.json({ error: "indisponible" }, { status: 503 });
  if (cached && cached.until > Date.now()) return Response.json({ token: cached.token });
  try {
    const res = await fetch("https://ws.colissimo.fr/widget-colissimo/rest/authenticate.rest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: env.COLISSIMO_API_KEY }),
    });
    const data = (await res.json().catch(() => null)) as { token?: string } | null;
    if (!res.ok || !data?.token) throw new Error(`Colissimo ${res.status}`);
    // Réutilisé 25 min (le jeton en vaut 30).
    cached = { token: data.token, until: Date.now() + 25 * 60_000 };
    return Response.json({ token: data.token });
  } catch (err) {
    console.error("colissimo:", err instanceof Error ? err.message : err);
    return Response.json({ error: "colissimo" }, { status: 503 });
  }
}

import type { QuizMode } from "@/content/quiz";
import { getEnvAsync, siteUrl } from "@/lib/env";
import { boardKey, cleanPseudo, isoWeek, scoreAnswers } from "@/lib/leaderboard";
import { isAllowedOrigin } from "@/lib/origin";

// GET  /api/leaderboard?theme=constantes&mode=pros  → top 10 de la semaine
// POST /api/leaderboard {theme, mode, answers:[{q,a}], ms, pseudo} → enregistre (score recalculé côté serveur)

const isMode = (v: unknown): v is QuizMode => v === "flash" || v === "pros";

async function board() {
  const env = await getEnvAsync();
  const ns = env.LEADERBOARD;
  return { env, stub: ns ? ns.get(ns.idFromName("global")) : null };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const theme = url.searchParams.get("theme") ?? "";
  const mode = url.searchParams.get("mode");
  if (!/^[a-z-]{2,40}$/.test(theme) || !isMode(mode)) return Response.json({ error: "params" }, { status: 400 });
  const { stub } = await board();
  if (!stub) return Response.json({ top: [], week: isoWeek() });
  try {
    const top = await stub.top(isoWeek(), boardKey(theme, mode), 10);
    return Response.json({ top, week: isoWeek() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("leaderboard GET:", err instanceof Error ? err.message : err);
    return Response.json({ top: [], week: isoWeek() });
  }
}

export async function POST(request: Request) {
  const { env, stub } = await board();
  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin, siteUrl(env))) return new Response("Origine non autorisée", { status: 403 });
  if (!stub) return Response.json({ error: "indisponible" }, { status: 503 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const theme = typeof body?.theme === "string" ? body.theme : "";
  const mode = body?.mode;
  if (!isMode(mode)) return Response.json({ error: "params" }, { status: 400 });
  const pseudo = cleanPseudo(body?.pseudo);
  if (!pseudo) return Response.json({ error: "pseudo" }, { status: 400 });
  const result = scoreAnswers(theme, mode, body?.answers, body?.ms);
  if (!result) return Response.json({ error: "score" }, { status: 400 });

  // Empreinte anonyme (IP hachée) pour limiter les envois ; l'IP n'est pas conservée en clair.
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`lpi-quiz:${ip}`));
  const who = Array.from(new Uint8Array(digest).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");

  try {
    const r = await stub.submit(isoWeek(), boardKey(theme, mode), { pseudo, ...result }, who);
    if (!r.ok) return Response.json({ error: r.error }, { status: 429 });
    return Response.json({ rank: r.rank, score: result.score, total: result.total });
  } catch (err) {
    console.error("leaderboard POST:", err instanceof Error ? err.message : err);
    return Response.json({ error: "indisponible" }, { status: 503 });
  }
}

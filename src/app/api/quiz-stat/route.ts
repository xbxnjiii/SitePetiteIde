import { getQuiz } from "@/content/quiz";
import { getEnvAsync, siteUrl } from "@/lib/env";
import { isAllowedOrigin } from "@/lib/origin";
import { recordQuizEvent } from "@/lib/quiz-stats";

// POST /api/quiz-stat {event, theme, mode, pct?} — statistiques anonymes des quiz (envoyées par le navigateur).
// L'événement « email » est enregistré côté serveur (api/quiz-email), pas ici.
const CLIENT_EVENTS = ["start", "finish", "pack", "share"] as const;

export async function POST(request: Request) {
  const env = await getEnvAsync();
  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin, siteUrl(env))) return new Response(null, { status: 403 });
  const body = (await request.json().catch(() => null)) as { event?: unknown; theme?: unknown; mode?: unknown; pct?: unknown } | null;
  const event = CLIENT_EVENTS.find((e) => e === body?.event);
  const theme = typeof body?.theme === "string" ? getQuiz(body.theme) : undefined;
  const mode = body?.mode === "flash" || body?.mode === "pros" ? body.mode : null;
  if (!event || !theme || !mode) return new Response(null, { status: 400 });
  const pct = event === "finish" && typeof body?.pct === "number" && Number.isFinite(body.pct) ? body.pct : null;
  try {
    await recordQuizEvent(env, { event, theme: theme.slug, mode, pct });
  } catch (err) {
    console.error("quiz-stat:", err instanceof Error ? err.message : err);
  }
  return new Response(null, { status: 204 });
}

import { quizzes } from "@/content/quiz";

// GET /api/question-du-jour — la même question pour tout le monde, une par jour (heure de Paris).
export const dynamic = "force-dynamic";

export function GET() {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date()); // AAAA-MM-JJ
  const pool = quizzes
    .filter((q) => q.status === "available" && q.slug !== "grand-mix")
    .flatMap((t) => t.questions.map((q) => ({ q, theme: t.title, slug: t.slug, icon: t.icon })));
  // Tirage déterministe à partir de la date (petit hachage), pour varier les thèmes d'un jour à l'autre.
  let h = 2166136261;
  for (const c of date) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const pick = pool[(h >>> 0) % pool.length];
  return Response.json(
    { date, theme: pick.theme, slug: pick.slug, icon: pick.icon, question: pick.q.question, choices: pick.q.choices, answer: pick.q.answer, explanation: pick.q.explanation },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}

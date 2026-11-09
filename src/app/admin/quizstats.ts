import { quizzes } from "@/content/quiz";
import type { QuizHit } from "@/lib/quiz-stats";

// Onglet « Quiz » de /admin : chiffres calculés à partir des événements anonymes (src/lib/quiz-stats.ts).

export const QUIZ_PERIODS = [7, 30, 90] as const;
export type QuizPeriod = (typeof QUIZ_PERIODS)[number];

type Counts = { start: number; finish: number; email: number; pack: number; share: number };
const zero = (): Counts => ({ start: 0, finish: 0, email: 0, pack: 0, share: 0 });

export interface QuizStatsView {
  period: QuizPeriod;
  totals: Counts;
  /** Score moyen (en %) des quiz terminés. */
  avg: number | null;
  days: { key: string; label: string; start: number; finish: number }[];
  themes: { slug: string; title: string; emoji: string; counts: Counts; avg: number | null }[];
  modes: Record<"flash" | "pros", Counts>;
  scores: { label: string; count: number }[];
  error: string | null;
}

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
const dayLabel = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
const mean = (list: number[]) => (list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : null);

export function buildQuizStats(hits: QuizHit[], period: QuizPeriod, error: string | null = null): QuizStatsView {
  const totals = zero();
  const modes = { flash: zero(), pros: zero() };
  const byTheme = new Map<string, { counts: Counts; pcts: number[] }>();
  const pcts: number[] = [];

  const days: QuizStatsView["days"] = [];
  const byDay = new Map<string, QuizStatsView["days"][number]>();
  const now = Date.now();
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000);
    const p = { key: dayKey.format(d), label: dayLabel(d), start: 0, finish: 0 };
    days.push(p);
    byDay.set(p.key, p);
  }

  for (const h of hits) {
    totals[h.event]++;
    modes[h.mode][h.event]++;
    const t = byTheme.get(h.theme) ?? { counts: zero(), pcts: [] };
    t.counts[h.event]++;
    if (h.event === "finish" && h.pct !== null) {
      t.pcts.push(h.pct);
      pcts.push(h.pct);
    }
    byTheme.set(h.theme, t);
    const d = byDay.get(h.day);
    if (d && h.event === "start") d.start++;
    if (d && h.event === "finish") d.finish++;
  }

  const bucket = (min: number, max: number) => pcts.filter((p) => p >= min && p <= max).length;
  return {
    period,
    totals,
    avg: mean(pcts),
    days,
    themes: quizzes
      .filter((q) => q.status === "available" || byTheme.has(q.slug))
      .map((q) => ({ slug: q.slug, title: q.title, emoji: q.emoji, counts: byTheme.get(q.slug)?.counts ?? zero(), avg: mean(byTheme.get(q.slug)?.pcts ?? []) }))
      .sort((a, b) => b.counts.start - a.counts.start),
    modes,
    scores: [
      { label: "Moins de 40 %", count: bucket(0, 39) },
      { label: "40 à 69 %", count: bucket(40, 69) },
      { label: "70 à 99 %", count: bucket(70, 99) },
      { label: "Sans faute (100 %)", count: bucket(100, 100) },
    ],
    error,
  };
}

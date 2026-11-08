import "server-only";
import { type AppEnv, siteUrl } from "./env";

// Statistiques des quiz, sans base de données : chaque événement est un petit objet VIDE dans R2,
// dont le nom contient toute l'information (jour, heure, événement, thème, format, score).
// Aucune donnée personnelle n'est enregistrée. La page /admin compte les objets (liste R2).

export const QUIZ_EVENTS = ["start", "finish", "email", "pack", "share"] as const;
export type QuizEvent = (typeof QUIZ_EVENTS)[number];

export interface QuizHit {
  ts: number; // millisecondes
  day: string; // AAAA-MM-JJ (Paris)
  event: QuizEvent;
  theme: string;
  mode: "flash" | "pros";
  /** Score en % (événement « finish » uniquement). */
  pct: number | null;
}

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
const prefix = (env: AppEnv) => `stats/${new URL(siteUrl(env)).hostname}/quiz/`;

export async function recordQuizEvent(env: AppEnv, e: Omit<QuizHit, "ts" | "day">): Promise<void> {
  if (!env.PDF_BUCKET) return;
  const now = Date.now();
  const pct = e.pct === null ? "_" : String(Math.max(0, Math.min(100, Math.round(e.pct))));
  const rand = crypto.randomUUID().slice(0, 8);
  await env.PDF_BUCKET.put(`${prefix(env)}${dayKey.format(new Date(now))}/${now}.${e.event}.${e.theme}.${e.mode}.${pct}.${rand}`, "");
}

const MAX_PAGES = 40; // 40 000 événements au maximum par lecture

/** Événements des `days` derniers jours (du plus ancien au plus récent). */
export async function listQuizEvents(env: AppEnv, days: number): Promise<QuizHit[]> {
  if (!env.PDF_BUCKET) return [];
  const p = prefix(env);
  const from = dayKey.format(new Date(Date.now() - (days - 1) * 86_400_000));
  const hits: QuizHit[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const res = await env.PDF_BUCKET.list({ prefix: p, limit: 1000, ...(cursor ? { cursor } : { startAfter: `${p}${from}` }) });
    for (const o of res.objects) {
      const [day, rest] = o.key.slice(p.length).split("/");
      const [ts, event, theme, mode, pct] = (rest ?? "").split(".");
      if (!day || day < from || !QUIZ_EVENTS.includes(event as QuizEvent) || (mode !== "flash" && mode !== "pros")) continue;
      hits.push({ ts: Number(ts), day, event: event as QuizEvent, theme, mode, pct: pct === "_" ? null : Number(pct) });
    }
    if (!res.truncated || !res.cursor) break;
    cursor = res.cursor;
  }
  return hits;
}

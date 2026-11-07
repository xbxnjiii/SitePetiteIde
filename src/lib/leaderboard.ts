// Règles communes du classement des quiz (pseudo, semaine, recalcul du score).
import { QUIZ_MODES, type QuizMode, getQuiz } from "@/content/quiz";

/** Semaine ISO (lundi → dimanche, heure UTC), ex. "2026-W45". */
export function isoWeek(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const week = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(week).padStart(2, "0")}`;
}

const BANNED = ["con", "connard", "connasse", "pute", "salope", "encule", "enculé", "merde", "bite", "nique", "fdp", "pd", "nazi", "hitler"];

/** Pseudo accepté : 2 à 16 caractères, lettres/chiffres/espaces/_-, sans grossièreté. */
export function cleanPseudo(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const p = v.normalize("NFC").replace(/\s+/g, " ").trim();
  if (p.length < 2 || p.length > 16) return null;
  if (!/^[\p{L}\p{N} _.-]+$/u.test(p)) return null;
  const flat = p.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
  if (BANNED.some((w) => flat === w || (w.length > 3 && flat.includes(w.normalize("NFD").replace(/[̀-ͯ]/g, ""))))) return null;
  return p;
}

export const boardKey = (theme: string, mode: QuizMode) => `${theme}:${mode}`;

/**
 * Recalcule le score à partir des réponses (index de question + choix).
 * Refuse les envois incohérents (mauvais nombre de questions, doublons, temps irréaliste).
 */
export function scoreAnswers(theme: string, mode: QuizMode, answers: unknown, ms: unknown) {
  const quiz = getQuiz(theme);
  const count = QUIZ_MODES[mode]?.count;
  if (!quiz || !count || !Array.isArray(answers) || answers.length !== Math.min(count, quiz.questions.length)) return null;
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < answers.length * 1500 || ms > 60 * 60_000) return null;
  const seen = new Set<number>();
  let score = 0;
  for (const a of answers) {
    const q = (a as { q?: unknown })?.q;
    const c = (a as { a?: unknown })?.a;
    if (typeof q !== "number" || typeof c !== "number" || seen.has(q) || !quiz.questions[q]) return null;
    seen.add(q);
    if (quiz.questions[q].answer === c) score++;
  }
  return { score, total: answers.length, ms: Math.round(ms) };
}

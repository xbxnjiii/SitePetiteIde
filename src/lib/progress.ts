"use client";
import { useEffect, useState } from "react";

// Progression des quiz, enregistrée UNIQUEMENT sur l'appareil (localStorage) : pas de compte, aucune donnée envoyée.
// Meilleurs scores, série de jours, points (niveau), succès, erreurs à réviser, réglage du son.

const KEY = "lpi:progression";
const EVENT = "lpi:progression";

export interface Progress {
  v: 1;
  /** Meilleur score par « thème:format ». */
  best: Record<string, { score: number; total: number }>;
  /** Parties terminées. */
  plays: number;
  xp: number;
  /** Série de jours : nombre de jours d'affilée et dernier jour joué (AAAA-MM-JJ, heure locale). */
  streak: { count: number; last: string; best: number };
  /** Questions ratées à réviser, par thème (indices dans les questions du thème). */
  wrong: Record<string, number[]>;
  /** Succès débloqués (identifiant → date). */
  badges: Record<string, string>;
  /** Question du jour : dernier jour répondu, nombre de réponses. */
  daily: { last: string; count: number; ok: boolean };
  /** Meilleure série de bonnes réponses d'affilée. */
  bestRun: number;
  sound: boolean;
}

const EMPTY: Progress = {
  v: 1,
  best: {},
  plays: 0,
  xp: 0,
  streak: { count: 0, last: "", best: 0 },
  wrong: {},
  badges: {},
  daily: { last: "", count: 0, ok: false },
  bestRun: 0,
  sound: true,
};

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
};

export function loadProgress(): Progress {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Progress> | null;
    if (!raw || raw.v !== 1) return structuredClone(EMPTY);
    return { ...structuredClone(EMPTY), ...raw, streak: { ...EMPTY.streak, ...raw.streak }, daily: { ...EMPTY.daily, ...raw.daily } };
  } catch {
    return structuredClone(EMPTY);
  }
}

function save(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* stockage indisponible (navigation privée…) : la progression n'est simplement pas gardée */
  }
}

/** Série de jours encore « vivante » (jouée aujourd'hui ou hier) ; sinon elle est retombée à 0. */
export const liveStreak = (p: Progress) => (p.streak.last === dayKey() || p.streak.last === yesterday() ? p.streak.count : 0);
export const playedToday = (p: Progress) => p.streak.last === dayKey();

function touchDay(p: Progress) {
  const today = dayKey();
  if (p.streak.last === today) return;
  p.streak.count = p.streak.last === yesterday() ? p.streak.count + 1 : 1;
  p.streak.last = today;
  p.streak.best = Math.max(p.streak.best, p.streak.count);
}

/* ---------- Niveaux ---------- */
/** Points nécessaires pour ATTEINDRE chaque niveau (niveau 1 = 0). Au-delà : +700 par niveau. */
const LEVELS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
export function levelOf(xp: number) {
  let level = 1;
  while (level < LEVELS.length && xp >= LEVELS[level]) level++;
  if (level === LEVELS.length) level += Math.floor((xp - LEVELS[LEVELS.length - 1]) / 700);
  const floor = level <= LEVELS.length ? LEVELS[level - 1] : LEVELS[LEVELS.length - 1] + (level - LEVELS.length) * 700;
  const ceil = level < LEVELS.length ? LEVELS[level] : floor + 700;
  return { level, floor, ceil, ratio: Math.min(1, (xp - floor) / (ceil - floor)) };
}

/* ---------- Succès ---------- */
export interface BadgeDef {
  id: string;
  title: string;
  hint: string;
  art: "sparkles" | "bolt" | "trophy" | "flame" | "check" | "brain" | "timer" | "duel" | "heart-pulse" | "mix";
}
export const BADGES: BadgeDef[] = [
  { id: "premier", title: "Premier quiz", hint: "Termine un quiz", art: "sparkles" },
  { id: "dix", title: "Habituée", hint: "Termine 10 quiz", art: "heart-pulse" },
  { id: "cinquante", title: "Inarrêtable", hint: "Termine 50 quiz", art: "duel" },
  { id: "parfait-flash", title: "Éclair parfait", hint: "Sans faute en Flash Quiz", art: "bolt" },
  { id: "parfait-pros", title: "Vraie pro", hint: "Sans faute au Quiz des Pros", art: "trophy" },
  { id: "run10", title: "En feu", hint: "10 bonnes réponses d'affilée", art: "flame" },
  { id: "jours3", title: "Régulière", hint: "3 jours d'affilée", art: "timer" },
  { id: "jours7", title: "Une semaine !", hint: "7 jours d'affilée", art: "flame" },
  { id: "jours30", title: "Un mois !", hint: "30 jours d'affilée", art: "trophy" },
  { id: "tour", title: "Tour complet", hint: "Joue tous les thèmes", art: "mix" },
  { id: "jour", title: "Question du jour", hint: "Réponds 5 fois à la question du jour", art: "brain" },
  { id: "revision", title: "Zéro erreur", hint: "Révise toutes tes erreurs d'un thème", art: "check" },
];

function unlock(p: Progress, themes: string[]): string[] {
  const has = (id: string, cond: boolean) => cond && !p.badges[id];
  const news: string[] = [];
  const played = new Set(Object.keys(p.best).map((k) => k.split(":")[0]));
  const perfect = (mode: string) => Object.entries(p.best).some(([k, b]) => k.endsWith(`:${mode}`) && b.score === b.total);
  const rules: [string, boolean][] = [
    ["premier", p.plays >= 1],
    ["dix", p.plays >= 10],
    ["cinquante", p.plays >= 50],
    ["parfait-flash", perfect("flash")],
    ["parfait-pros", perfect("pros")],
    ["run10", p.bestRun >= 10],
    ["jours3", p.streak.best >= 3],
    ["jours7", p.streak.best >= 7],
    ["jours30", p.streak.best >= 30],
    ["tour", themes.length > 0 && themes.every((t) => played.has(t))],
    ["jour", p.daily.count >= 5],
  ];
  for (const [id, cond] of rules) {
    if (has(id, cond)) {
      p.badges[id] = new Date().toISOString();
      news.push(id);
    }
  }
  return news;
}

export interface GameOutcome {
  xp: number;
  newBest: boolean;
  badges: string[];
  levelUp: number | null;
  streak: number;
}

/** Enregistre une partie terminée. `review` = partie de révision des erreurs (pas de record). */
export function recordGame(g: {
  slug: string;
  mode: string;
  score: number;
  total: number;
  right: number[];
  wrong: number[];
  run: number;
  review: boolean;
  themes: string[];
}): GameOutcome {
  const p = loadProgress();
  const before = levelOf(p.xp).level;
  const xp = g.score * 10 + (g.review ? 0 : 20) + (g.score === g.total && !g.review ? 50 : 0);
  p.xp += xp;
  touchDay(p);
  p.bestRun = Math.max(p.bestRun, g.run);

  let newBest = false;
  if (!g.review) {
    p.plays++;
    const key = `${g.slug}:${g.mode}`;
    const prev = p.best[key];
    if (!prev || g.score / g.total > prev.score / prev.total) {
      p.best[key] = { score: g.score, total: g.total };
      newBest = Boolean(prev);
    }
  }
  // Erreurs à réviser : on ajoute les ratées, on retire celles réussies.
  const list = new Set(p.wrong[g.slug] ?? []);
  g.wrong.forEach((i) => list.add(i));
  g.right.forEach((i) => list.delete(i));
  const had = (p.wrong[g.slug] ?? []).length > 0;
  p.wrong[g.slug] = [...list].slice(-60);

  const badges = unlock(p, g.themes);
  if (g.review && had && list.size === 0 && !p.badges.revision) {
    p.badges.revision = new Date().toISOString();
    badges.push("revision");
  }
  save(p);
  const after = levelOf(p.xp).level;
  return { xp, newBest, badges, levelUp: after > before ? after : null, streak: p.streak.count };
}

/** Enregistre la réponse à la question du jour (une fois par jour). */
export function recordDaily(ok: boolean): { xp: number; badges: string[] } {
  const p = loadProgress();
  if (p.daily.last === dayKey()) return { xp: 0, badges: [] };
  p.daily = { last: dayKey(), count: p.daily.count + 1, ok };
  const xp = ok ? 15 : 5;
  p.xp += xp;
  touchDay(p);
  const badges = unlock(p, []);
  save(p);
  return { xp, badges };
}

export function setSound(on: boolean) {
  const p = loadProgress();
  p.sound = on;
  save(p);
}

/** Progression en direct dans un composant (null tant que le navigateur n'a pas chargé). */
export function useProgress(): Progress | null {
  const [p, setP] = useState<Progress | null>(null);
  useEffect(() => {
    const read = () => setP(loadProgress());
    read();
    window.addEventListener(EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);
  return p;
}

/* ---------- Mes fiches sur cet appareil ---------- */
const ORDERS = "lpi:achats";
export interface SavedOrder {
  id: string;
  name: string;
  /** Fin de validité des liens (secondes Unix). */
  until: number;
}
export function savedOrders(): SavedOrder[] {
  try {
    const list = JSON.parse(localStorage.getItem(ORDERS) ?? "[]") as SavedOrder[];
    return Array.isArray(list) ? list.filter((o) => o && typeof o.id === "string" && o.until * 1000 > Date.now()) : [];
  } catch {
    return [];
  }
}
export function rememberOrder(o: SavedOrder) {
  try {
    const list = [o, ...savedOrders().filter((x) => x.id !== o.id)].slice(0, 5);
    localStorage.setItem(ORDERS, JSON.stringify(list));
  } catch {
    /* stockage indisponible */
  }
}

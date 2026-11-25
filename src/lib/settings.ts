import "server-only";
import type { Pack } from "@/content/packs";
import { type AppEnv, siteUrl } from "./env";

// Réglages modifiables depuis /admin (interrupteurs), sans base de données :
// un petit fichier JSON dans le bucket R2, un par site (prod et préprod partagent le bucket).

export interface Settings {
  /** Vente de la version papier, par pack (slug → activée). Absent = désactivée. */
  print: Record<string, boolean>;
  /** Vente des fiches de révision A4, par pack. Absent = désactivée. */
  revision: Record<string, boolean>;
  /** Vente des fiches à l'unité, par pack (slug → activée). Absent = désactivée. */
  unit: Record<string, boolean>;
  /** Formulaire « correction + fiche gratuite » en fin de quiz et séquence d'emails. */
  quizEmails: boolean;
  /** Éléments supprimés de /admin (tests…) : masqués des listes et des statistiques, restaurables. */
  hidden: { orders: string[]; emails: string[] };
  /** « Repartir de zéro » : tout ce qui a été créé avant cette date (secondes Unix) est ignoré dans /admin. */
  resetAt: number | null;
  /** Éléments de la page de liens (accueil) : affichés ou masqués. */
  bio: Record<BioKey, boolean>;
  /** Boutons ajoutés à la page de liens, dans l'ordre d'affichage. */
  links: BioLink[];
  /** Adresses qui reçoivent une copie cachée des emails de commande (production uniquement, voir src/lib/email.ts). */
  orderCopies: string[];
}

/** Éléments de la page de liens que l'on peut afficher / masquer depuis /admin. */
export const BIO_ITEMS = [
  { key: "offer", label: "Bandeau de l'offre", help: "Code promo en haut de page (pendant une offre)" },
  { key: "slogan", label: "Slogan", help: "« Les soins, simplement. »" },
  { key: "tagline", label: "Phrase d'accroche", help: "« Fiches mémo pour étudiants infirmiers 💙 »" },
  { key: "tiktok", label: "Icône TikTok", help: "Réseaux sous le logo" },
  { key: "instagram", label: "Icône Instagram", help: "Réseaux sous le logo" },
  { key: "mail", label: "Icône email", help: "Réseaux sous le logo" },
  { key: "packs", label: "Pack(s) en vente", help: "Le gros bouton vers la page du pack" },
  { key: "quiz", label: "Bouton « Quiz gratuits »", help: "Lien vers les quiz" },
  { key: "soon", label: "« D'autres packs arrivent bientôt »", help: "Encart avec la mascotte" },
  { key: "tip", label: "Soutien (1, 2 ou 5 €)", help: "Bloc en bas de page" },
] as const;
export type BioKey = (typeof BIO_ITEMS)[number]["key"];

export interface BioLink {
  id: string;
  label: string;
  url: string;
  emoji: string;
  on: boolean;
}
export const MAX_LINKS = 10;

const DEFAULT_BIO = Object.fromEntries(BIO_ITEMS.map((i) => [i.key, true])) as Record<BioKey, boolean>;

export const DEFAULT_SETTINGS: Settings = {
  print: {},
  revision: {},
  unit: {},
  quizEmails: true,
  hidden: { orders: [], emails: [] },
  resetAt: null,
  bio: DEFAULT_BIO,
  links: [],
  orderCopies: [],
};

/** Nombre maximum d'adresses en copie des emails de commande. */
export const MAX_ORDER_COPIES = 5;
const EMAIL_RE = /^[^\s@,;]{1,64}@[^\s@,;]{1,190}\.[a-z]{2,}$/i;

/**
 * Liste d'adresses saisie dans /admin (séparées par des virgules, points-virgules, espaces ou retours à la ligne).
 * Renvoie null si une adresse est invalide ou s'il y en a trop.
 */
export function parseEmailList(text: string): string[] | null {
  const list = [...new Set(text.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
  return list.length <= MAX_ORDER_COPIES && list.every((e) => EMAIL_RE.test(e)) ? list : null;
}

/** Adresse autorisée pour un bouton : https://…, mailto:… ou une page du site (/…). */
export function cleanLinkUrl(v: string): string | null {
  const url = v.trim();
  if (/^\/(?!\/)[^\s]{0,300}$/.test(url)) return url;
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(url)) return url;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && url.length <= 500 ? u.toString() : null;
  } catch {
    return null;
  }
}

function parseLinks(v: unknown): BioLink[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((l): l is BioLink => l && typeof l.id === "string" && typeof l.label === "string" && typeof l.url === "string")
    .filter((l) => cleanLinkUrl(l.url) !== null)
    .slice(0, MAX_LINKS)
    .map((l) => ({ id: l.id, label: l.label.slice(0, 60), url: l.url, emoji: typeof l.emoji === "string" ? l.emoji.slice(0, 8) : "", on: l.on !== false }));
}

const MAX_HIDDEN = 3000;
const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(-MAX_HIDDEN) : []);

const CACHE_MS = 15_000;
let cache: { at: number; key: string; value: Settings } | null = null;

const keyFor = (env: AppEnv) => `config/reglages-${new URL(siteUrl(env)).hostname}.json`;

export async function getSettings(env: AppEnv): Promise<Settings> {
  const key = keyFor(env);
  if (cache && cache.key === key && Date.now() - cache.at < CACHE_MS) return cache.value;
  let value = DEFAULT_SETTINGS;
  try {
    const obj = await env.PDF_BUCKET?.get(key);
    if (obj) {
      const raw = (await new Response(obj.body).json()) as Partial<Settings>;
      value = {
        print: raw.print && typeof raw.print === "object" ? raw.print : {},
        revision: raw.revision && typeof raw.revision === "object" ? raw.revision : {},
        unit: raw.unit && typeof raw.unit === "object" ? raw.unit : {},
        quizEmails: raw.quizEmails !== false,
        hidden: { orders: ids(raw.hidden?.orders), emails: ids(raw.hidden?.emails) },
        resetAt: typeof raw.resetAt === "number" ? raw.resetAt : null,
        bio: Object.fromEntries(BIO_ITEMS.map((i) => [i.key, raw.bio?.[i.key] !== false])) as Record<BioKey, boolean>,
        links: parseLinks(raw.links),
        orderCopies: Array.isArray(raw.orderCopies)
          ? raw.orderCopies.filter((e): e is string => typeof e === "string" && EMAIL_RE.test(e)).slice(0, MAX_ORDER_COPIES)
          : [],
      };
    }
  } catch (err) {
    console.error("settings:", err instanceof Error ? err.message : err);
  }
  cache = { at: Date.now(), key, value };
  return value;
}

export async function saveSettings(env: AppEnv, value: Settings): Promise<void> {
  if (!env.PDF_BUCKET) throw new Error("Bucket R2 absent");
  await env.PDF_BUCKET.put(keyFor(env), JSON.stringify(value, null, 2), { httpMetadata: { contentType: "application/json" } });
  cache = { at: Date.now(), key: keyFor(env), value };
}

/** Le pack tel qu'il est vendu en ce moment : sans version papier ni vente à l'unité si elles sont désactivées. */
export function applySettings(pack: Pack, s: Settings): Pack {
  let p = pack;
  if (p.print && !s.print[p.slug]) p = { ...p, print: undefined };
  if (p.revision && !s.revision?.[p.slug]) p = { ...p, revision: undefined };
  // Pack complet : seulement si les fiches de poche ET de révision sont en vente.
  if (p.bundle && (!p.print || !p.revision)) p = { ...p, bundle: undefined };
  if (p.unit && !s.unit[p.slug]) p = { ...p, unit: undefined };
  return p;
}

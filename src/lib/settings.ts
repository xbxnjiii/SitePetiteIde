import "server-only";
import type { Pack } from "@/content/packs";
import { type AppEnv, siteUrl } from "./env";

// Réglages modifiables depuis /admin (interrupteurs), sans base de données :
// un petit fichier JSON dans le bucket R2, un par site (prod et préprod partagent le bucket).

export interface Settings {
  /** Vente de la version papier, par pack (slug → activée). Absent = désactivée. */
  print: Record<string, boolean>;
  /** Formulaire « correction + fiche gratuite » en fin de quiz et séquence d'emails. */
  quizEmails: boolean;
}

export const DEFAULT_SETTINGS: Settings = { print: {}, quizEmails: true };

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
        quizEmails: raw.quizEmails !== false,
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

/** Le pack tel qu'il est vendu en ce moment : sans version papier si elle est désactivée. */
export function applySettings(pack: Pack, s: Settings): Pack {
  return pack.print && !s.print[pack.slug] ? { ...pack, print: undefined } : pack;
}

import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Sous-ensemble de l'API R2 utilisé par le site (évite un fichier de types généré). */
export interface R2BucketLike {
  get(key: string): Promise<{ body: ReadableStream; size: number } | null>;
  head(key: string): Promise<{ size: number } | null>;
  put(key: string, value: string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
}

/** Variables et secrets du Worker (wrangler.jsonc "vars" + `wrangler secret put`). */
export interface AppEnv {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  RESEND_API_KEY?: string;
  DOWNLOAD_TOKEN_SECRET?: string;
  SITE_URL?: string;
  /** Clé publique Stripe (wrangler.jsonc), envoyée au navigateur avec la session de paiement. */
  STRIPE_PUBLISHABLE_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  STRIPE_AUTOMATIC_TAX?: string;
  /** Adresse qui reçoit les commandes papier à préparer (défaut : EMAIL_REPLY_TO). */
  ORDERS_NOTIFY_TO?: string;
  /** Mot de passe de la page /admin (secret). Sans lui, la page est fermée. */
  ADMIN_PASSWORD?: string;
  /** Clé Resend « Full access » pour lire l'historique des emails dans /admin (sinon RESEND_API_KEY). */
  RESEND_ADMIN_KEY?: string;
  PDF_BUCKET?: R2BucketLike;
}

export function getEnv(): AppEnv {
  return getCloudflareContext().env as unknown as AppEnv;
}

export async function getEnvAsync(): Promise<AppEnv> {
  return (await getCloudflareContext({ async: true })).env as unknown as AppEnv;
}

export function requireVar<K extends keyof AppEnv>(env: AppEnv, key: K): NonNullable<AppEnv[K]> {
  const v = env[key];
  if (!v) throw new Error(`Configuration manquante : ${String(key)}`);
  return v as NonNullable<AppEnv[K]>;
}

export const siteUrl = (env: AppEnv) => (env.SITE_URL ?? "https://lapetiteide.fr").replace(/\/$/, "");

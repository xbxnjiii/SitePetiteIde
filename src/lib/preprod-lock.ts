import "server-only";
import type { AppEnv } from "./env";

// Verrou de la préprod : mot de passe dans le secret Cloudflare PREPROD_PASSWORD (Worker preprodlapetiteide).
// Une fois le mot de passe saisi, un cookie (empreinte du mot de passe) ouvre le site pendant 30 jours.
// Sans secret défini, la préprod reste ouverte. La production n'est jamais concernée.

export const LOCK_COOKIE = "lpi_preprod";
export const LOCK_DAYS = 30;

export async function lockToken(password: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`lpi-preprod|${password}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Le visiteur a-t-il déverrouillé la préprod ? (toujours vrai si aucun mot de passe n'est défini) */
export async function isUnlocked(env: AppEnv, cookieValue: string | undefined): Promise<boolean> {
  const pwd = env.PREPROD_PASSWORD;
  if (!pwd) return true;
  return cookieValue === (await lockToken(pwd));
}

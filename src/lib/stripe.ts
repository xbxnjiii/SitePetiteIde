import "server-only";
import Stripe from "stripe";
import { type AppEnv, requireVar } from "./env";

/** Client Stripe compatible Cloudflare Workers (HTTP via fetch). */
export function stripeClient(env: AppEnv) {
  return new Stripe(requireVar(env, "STRIPE_SECRET_KEY"), {
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 2,
    appInfo: { name: "la-petite-ide" },
  });
}

/** Clé de recherche Stripe du prix : le slug (pack PDF), « slug-papier » ou « slug-fiche » (voir scripts/stripe-sync.mts). */
export const priceLookupKey = (slug: string, format: "pdf" | "fiches" | "papier" = "pdf") =>
  format === "papier" ? `${slug}-papier` : format === "fiches" ? `${slug}-fiche` : slug;

export function isEnabled(v: string | undefined, fallback: boolean) {
  if (v === undefined || v === "") return fallback;
  return v === "true" || v === "1";
}

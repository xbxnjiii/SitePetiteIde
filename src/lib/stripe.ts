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

/** La clé de recherche Stripe d'un pack = son slug (voir scripts/stripe-sync.mjs). */
export const priceLookupKey = (slug: string) => slug;

export function isEnabled(v: string | undefined, fallback: boolean) {
  if (v === undefined || v === "") return fallback;
  return v === "true" || v === "1";
}

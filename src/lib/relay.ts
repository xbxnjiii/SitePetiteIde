import "server-only";
import { SHIPPING_METHODS, type ShippingMethod } from "@/content/shipping";
import { IS_PREPROD } from "./format";
import type { AppEnv } from "./env";

// Cartes de choix des points relais : chaque transporteur demande un identifiant pro.
//  - Mondial Relay : « code enseigne » (MONDIAL_RELAY_BRAND). En préprod, code de test public si absent.
//  - Colissimo : clé d'API de l'espace Colissimo Entreprise (secret COLISSIMO_API_KEY).
// Sans identifiant, le mode « point relais » du transporteur n'est pas proposé.

/** Code de test documenté par Mondial Relay (préprod uniquement). */
const MONDIAL_RELAY_TEST_BRAND = "BDTEST  ";

export interface RelayConfig {
  /** Code enseigne passé à la carte Mondial Relay (null = carte indisponible). */
  mondialRelayBrand: string | null;
  /** Carte Colissimo disponible (clé d'API configurée). */
  colissimo: boolean;
}

export function relayConfig(env: AppEnv): RelayConfig {
  const brand = env.MONDIAL_RELAY_BRAND?.trim();
  return {
    mondialRelayBrand: brand ? env.MONDIAL_RELAY_BRAND! : IS_PREPROD ? MONDIAL_RELAY_TEST_BRAND : null,
    colissimo: Boolean(env.COLISSIMO_API_KEY),
  };
}

/** Modes de livraison proposés en ce moment (les points relais seulement si la carte du transporteur est disponible). */
export function availableMethods(env: AppEnv): ShippingMethod[] {
  const c = relayConfig(env);
  return SHIPPING_METHODS.filter(
    (m) => !m.relay || (m.carrier === "mondial-relay" ? Boolean(c.mondialRelayBrand) : c.colissimo),
  );
}

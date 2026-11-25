import "server-only";
import { publishedPacks } from "@/content/packs";
import type { IconName } from "@/content/packs";
import type { ShippingMethod } from "@/content/shipping";
import type { AppEnv } from "./env";
import { availableMethods, relayConfig } from "./relay";
import { applySettings, getSettings } from "./settings";

// Catalogue envoyé au navigateur (panier, suggestions) : packs tels qu'ils sont vendus en ce moment.

export interface CatalogImage {
  src: string;
  width: number;
  height: number;
}

export interface CatalogPack {
  slug: string;
  name: string;
  /** Nom court (« Pack Constantes »). */
  shortName: string;
  tagline: string;
  /** Visuel du pack numérique. */
  image: CatalogImage | null;
  /** Photo des fiches papier (sinon le visuel du pack). */
  paperImage: CatalogImage | null;
  priceCents: number;
  /** Nombre de fiches du pack complet (fiche bonus comprise). */
  packCount: number;
  print: { priceCents: number; soldOut: boolean } | null;
  unit: { priceCents: number; items: { title: string; icon: IconName }[] } | null;
}

export interface ShopConfig {
  catalog: CatalogPack[];
  /** Modes de livraison proposés (du moins cher au plus cher). */
  shippingMethods: ShippingMethod[];
  /** Code enseigne de la carte Mondial Relay (null : carte indisponible). */
  mondialRelayBrand: string | null;
}

export async function shopConfig(env: AppEnv): Promise<ShopConfig> {
  const settings = await getSettings(env);
  const catalog = publishedPacks().map((raw): CatalogPack => {
    const pack = applySettings(raw, settings);
    const image = pack.digitalImage ?? (pack.images ? { src: pack.images.card, width: 800, height: 800 } : null);
    const photo = pack.print?.photos?.[0];
    return {
      slug: pack.slug,
      name: pack.name,
      shortName: pack.name.replace(/^Pack Mémos : /, "Pack "),
      tagline: pack.tagline,
      image: image ? { src: image.src, width: image.width, height: image.height } : null,
      paperImage: photo ? { src: photo.src, width: photo.width, height: photo.height } : image ? { src: image.src, width: image.width, height: image.height } : null,
      priceCents: pack.priceCents,
      packCount: pack.items.length + (pack.bonus ? 1 : 0),
      print: pack.print ? { priceCents: pack.print.priceCents, soldOut: Boolean(pack.print.soldOut) } : null,
      unit: pack.unit
        ? { priceCents: pack.unit.priceCents, items: pack.items.slice(0, pack.unit.files.length).map((i) => ({ title: i.title, icon: i.icon })) }
        : null,
    };
  });
  return { catalog, shippingMethods: availableMethods(env), mondialRelayBrand: relayConfig(env).mondialRelayBrand };
}

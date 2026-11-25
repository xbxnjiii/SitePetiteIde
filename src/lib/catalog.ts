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
  /** Nom court (« Les constantes »). */
  shortName: string;
  tagline: string;
  /** Visuel du pack numérique. */
  image: CatalogImage | null;
  /** Photo des fiches papier (sinon le visuel du pack). */
  paperImage: CatalogImage | null;
  priceCents: number;
  /** Nombre de fiches du pack complet (fiche bonus comprise). */
  packCount: number;
  print: { priceCents: number; soldOut: boolean; label: string } | null;
  /** Mot pour compter les fiches [singulier, pluriel]. */
  countWord: [string, string];
  /** Fiches de révision A4 (null : pas en vente). */
  revision: { priceCents: number; soldOut: boolean; image: CatalogImage | null } | null;
  /** Pack complet numérique + poche + révision (null : pas en vente). */
  bundle: { priceCents: number; soldOut: boolean; image: CatalogImage | null } | null;
  unit: { priceCents: number; items: { title: string; icon: IconName }[] } | null;
}

export interface ShopConfig {
  catalog: CatalogPack[];
  /** Modes de livraison proposés (du moins cher au plus cher). */
  shippingMethods: ShippingMethod[];
  /** Code enseigne de la carte Mondial Relay (null : carte indisponible). */
  mondialRelayBrand: string | null;
}

const img = (i: { src: string; width: number; height: number } | undefined | null): CatalogImage | null =>
  i ? { src: i.src, width: i.width, height: i.height } : null;

export async function shopConfig(env: AppEnv): Promise<ShopConfig> {
  const settings = await getSettings(env);
  const catalog = publishedPacks().map((raw): CatalogPack => {
    const pack = applySettings(raw, settings);
    const image = pack.digitalImage ?? (pack.images ? { src: pack.images.card, width: 800, height: 800 } : null);
    const photo = pack.print?.photos?.[0];
    return {
      slug: pack.slug,
      name: pack.name,
      shortName: pack.name,
      tagline: pack.tagline,
      image: image ? { src: image.src, width: image.width, height: image.height } : null,
      paperImage: photo ? { src: photo.src, width: photo.width, height: photo.height } : image ? { src: image.src, width: image.width, height: image.height } : null,
      priceCents: pack.priceCents,
      packCount: pack.items.length + (pack.bonus ? 1 : 0),
      print: pack.print ? { priceCents: pack.print.priceCents, soldOut: Boolean(pack.print.soldOut), label: pack.print.label ?? "Fiches de poche" } : null,
      countWord: pack.countWord ?? ["fiche", "fiches"],
      revision: pack.revision
        ? { priceCents: pack.revision.priceCents, soldOut: Boolean(pack.revision.soldOut), image: img(pack.revision.photos?.[0]) }
        : null,
      bundle:
        pack.bundle && pack.print && pack.revision
          ? { priceCents: pack.bundle.priceCents, soldOut: Boolean(pack.print.soldOut || pack.revision.soldOut), image: img(pack.bundle.photo ?? photo) }
          : null,
      unit: pack.unit
        ? { priceCents: pack.unit.priceCents, items: pack.items.slice(0, pack.unit.files.length).map((i) => ({ title: i.title, icon: i.icon })) }
        : null,
    };
  });
  return { catalog, shippingMethods: availableMethods(env), mondialRelayBrand: relayConfig(env).mondialRelayBrand };
}

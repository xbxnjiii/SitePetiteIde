// Panier : lignes { pack, format, quantité, fiches } partagées entre le navigateur et le serveur.
// Le serveur revalide tout (packs en vente, formats activés, prix venant de Stripe).
import { type Pack, type PackFormat, formatPriceCents, parseFormat } from "@/content/packs";

export interface CartLine {
  /** Slug du pack. */
  pack: string;
  /** pdf = pack numérique ; papier = fiches de poche (numérique offert) ; fiches = fiches numériques à l'unité. */
  format: PackFormat;
  /** Nombre d'exemplaires (papier uniquement ; 1 pour le numérique). */
  qty: number;
  /** À l'unité : indices des fiches choisies (dans pack.items). */
  fiches?: number[];
}

export const MAX_PAPER_QTY = 10;
/** Nombre maximum de lignes dans un panier. */
export const MAX_LINES = 20;

/** Identifiant d'une ligne : un pack ne peut apparaître qu'une fois par format. */
export const lineKey = (l: Pick<CartLine, "pack" | "format">) => `${l.pack}:${l.format}`;

/** Prix TTC d'une ligne (centimes). */
export function linePriceCents(pack: Pack, line: CartLine): number {
  const unit = formatPriceCents(pack, line.format);
  return line.format === "fiches" ? unit * (line.fiches?.length ?? 0) : line.format === "papier" ? unit * line.qty : unit;
}

/** La ligne donne droit au pack numérique complet (PDF + images) : pack numérique ou fiches papier. */
export const isFullPack = (l: CartLine) => l.format === "pdf" || l.format === "papier";

/**
 * Nettoie un panier venu du navigateur (ou des métadonnées Stripe) :
 * packs connus, formats valides, quantités bornées, doublons fusionnés, numérique déjà inclus retiré.
 * `findPack` renvoie le pack tel qu'il est vendu (null s'il n'existe pas ou plus).
 */
export function cleanCart(
  raw: unknown,
  findPack: (slug: string) => Pack | null | undefined,
  /** false : commande déjà passée (on ne vérifie pas que le format est encore en vente). */
  forSale = true,
): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const byKey = new Map<string, CartLine>();
  for (const r of raw.slice(0, MAX_LINES)) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const pack = typeof o.pack === "string" ? findPack(o.pack) : null;
    if (!pack) continue;
    const format = parseFormat(o.format);
    if (forSale && format === "papier" && (!pack.print || pack.print.soldOut)) continue;
    if (format === "fiches" && !pack.unit) continue;
    let line: CartLine = { pack: pack.slug, format, qty: 1 };
    if (format === "papier") line.qty = Math.min(MAX_PAPER_QTY, Math.max(1, Math.floor(Number(o.qty) || 1)));
    if (format === "fiches") {
      const ids = Array.isArray(o.fiches) ? o.fiches : [];
      const fiches = [...new Set(ids.map(Number))]
        .filter((i) => Number.isInteger(i) && i >= 0 && i < pack.items.length && i < (pack.unit?.files.length ?? 0))
        .sort((a, b) => a - b);
      if (!fiches.length) continue;
      line = { ...line, fiches };
    }
    const prev = byKey.get(lineKey(line));
    if (prev && format === "papier") prev.qty = Math.min(MAX_PAPER_QTY, prev.qty + line.qty);
    else if (prev && format === "fiches") prev.fiches = [...new Set([...(prev.fiches ?? []), ...(line.fiches ?? [])])].sort((a, b) => a - b);
    else if (!prev) byKey.set(lineKey(line), line);
  }
  const lines = [...byKey.values()];
  // Numérique déjà inclus : le pack numérique est offert avec le papier ; les fiches à l'unité sont dans le pack.
  return lines.filter(
    (l) =>
      !(l.format === "pdf" && lines.some((x) => x.pack === l.pack && x.format === "papier")) &&
      !(l.format === "fiches" && lines.some((x) => x.pack === l.pack && isFullPack(x))),
  );
}

/** Panier → texte court pour les métadonnées Stripe : « slug:pdf;slug:papier*2;slug:fiches:0.2.5 ». */
export function encodeCart(lines: CartLine[]): string {
  return lines
    .map((l) => (l.format === "papier" ? `${l.pack}:papier*${l.qty}` : l.format === "fiches" ? `${l.pack}:fiches:${(l.fiches ?? []).join(".")}` : `${l.pack}:pdf`))
    .join(";");
}

/** Texte des métadonnées → lignes (non validées : passer ensuite par cleanCart). */
export function decodeCart(s: string | undefined | null): unknown[] {
  if (!s) return [];
  return s.split(";").map((part) => {
    const [pack, rest = "", fiches = ""] = part.split(":");
    const [format, qty] = rest.split("*");
    return { pack, format, qty: Number(qty) || 1, fiches: fiches ? fiches.split(".").map(Number) : [] };
  });
}

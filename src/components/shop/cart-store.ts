"use client";
import { useSyncExternalStore } from "react";
import { type CartLine, MAX_PAPER_QTY, isFullPack, lineKey, linePriceCents } from "@/lib/cart";
import type { CatalogPack } from "@/lib/catalog";
import type { Pack } from "@/content/packs";

// Panier enregistré sur l'appareil (localStorage), partagé entre les onglets et les composants.

const KEY = "lpi:panier";
const EVENT = "lpi:panier";
const EMPTY: CartLine[] = [];
let cache: CartLine[] | null = null;

function read(): CartLine[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as CartLine[]).filter((l) => l && typeof l.pack === "string" && typeof l.format === "string") : [];
  } catch {
    return [];
  }
}
const get = () => (cache ??= read());
function write(lines: CartLine[]) {
  cache = lines;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}
function subscribe(cb: () => void) {
  const onLocal = () => cb();
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    cb();
  };
  window.addEventListener(EVENT, onLocal);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onLocal);
    window.removeEventListener("storage", onStorage);
  };
}

/** Lignes du panier (vide pendant le rendu serveur). */
export const useCart = () => useSyncExternalStore(subscribe, get, () => EMPTY);

/** Nombre d'articles (exemplaires papier comptés un par un, fiches à l'unité comptées une par une). */
export const cartCount = (lines: CartLine[]) =>
  lines.reduce((n, l) => n + (l.format === "papier" ? l.qty : l.format === "fiches" ? (l.fiches?.length ?? 0) : 1), 0);

export interface AddResult {
  added: boolean;
  /** Précision affichée à la cliente (numérique déjà inclus, etc.). */
  note?: string;
}

/** Ajoute une ligne en évitant les doublons (le numérique est offert avec le papier, l'unité est incluse dans le pack). */
export function addToCart(line: CartLine): AddResult {
  const lines = get().map((l) => ({ ...l }));
  const same = (l: CartLine) => l.pack === line.pack;
  if (line.format === "pdf") {
    if (lines.some((l) => same(l) && l.format === "papier")) {
      return { added: false, note: "La version numérique est déjà offerte avec les fiches de poche de ton panier." };
    }
    if (lines.some((l) => same(l) && l.format === "pdf")) return { added: false, note: "Ce pack est déjà dans ton panier." };
    const hadUnit = lines.some((l) => same(l) && l.format === "fiches");
    write([...lines.filter((l) => !(same(l) && l.format === "fiches")), { pack: line.pack, format: "pdf", qty: 1 }]);
    return { added: true, note: hadUnit ? "Le pack complet remplace les fiches à l'unité de ton panier." : undefined };
  }
  if (line.format === "papier") {
    const existing = lines.find((l) => same(l) && l.format === "papier");
    const hadDigital = lines.some((l) => same(l) && l.format !== "papier");
    const rest = lines.filter((l) => !(same(l) && l.format !== "papier"));
    if (existing) existing.qty = Math.min(MAX_PAPER_QTY, existing.qty + line.qty);
    write(existing ? rest : [...rest, { pack: line.pack, format: "papier", qty: Math.min(MAX_PAPER_QTY, line.qty) }]);
    return { added: true, note: hadDigital ? "La version numérique est offerte avec les fiches de poche : on l'a retirée de ton panier." : undefined };
  }
  // À l'unité
  if (lines.some((l) => same(l) && isFullPack(l))) return { added: false, note: "Ces fiches sont déjà incluses dans le pack de ton panier." };
  const existing = lines.find((l) => same(l) && l.format === "fiches");
  const fiches = [...new Set([...(existing?.fiches ?? []), ...(line.fiches ?? [])])].sort((a, b) => a - b);
  write([...lines.filter((l) => l !== existing), { pack: line.pack, format: "fiches", qty: 1, fiches }]);
  return { added: true };
}

export function setQty(key: string, qty: number) {
  write(get().map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(MAX_PAPER_QTY, Math.max(1, qty)) } : l)));
}

export function setFiches(key: string, fiches: number[]) {
  if (!fiches.length) return removeLine(key);
  write(get().map((l) => (lineKey(l) === key ? { ...l, fiches: [...fiches].sort((a, b) => a - b) } : l)));
}

export function removeLine(key: string) {
  write(get().filter((l) => lineKey(l) !== key));
}

export function clearCart() {
  write([]);
}

/** Pack du catalogue au format attendu par le calcul de prix. */
const asPack = (c: CatalogPack) =>
  ({
    priceCents: c.priceCents,
    print: c.print ? { priceCents: c.print.priceCents } : undefined,
    unit: c.unit ? { priceCents: c.unit.priceCents } : undefined,
  }) as unknown as Pack;

/** Lignes encore en vente (avec leur pack) et lignes devenues indisponibles. */
export function resolveCart(lines: CartLine[], catalog: CatalogPack[]) {
  const ok: { line: CartLine; pack: CatalogPack; cents: number }[] = [];
  const unavailable: CartLine[] = [];
  for (const line of lines) {
    const pack = catalog.find((p) => p.slug === line.pack);
    const sellable =
      pack && (line.format === "pdf" || (line.format === "papier" && pack.print && !pack.print.soldOut) || (line.format === "fiches" && pack.unit && line.fiches?.length));
    if (pack && sellable) ok.push({ line, pack, cents: linePriceCents(asPack(pack), line) });
    else unavailable.push(line);
  }
  return { ok, unavailable, subtotal: ok.reduce((s, x) => s + x.cents, 0) };
}

export interface Suggestion {
  pack: CatalogPack;
  line: CartLine;
  title: string;
  subtitle: string;
  cents: number;
  image: CatalogPack["image"];
}

/** Produits à proposer (« Tu aimeras aussi ») : la version papier d'un pack numérique du panier, puis les autres packs. */
export function suggestions(lines: CartLine[], catalog: CatalogPack[], max = 3): Suggestion[] {
  const out: Suggestion[] = [];
  const has = (slug: string, f?: string) => lines.some((l) => l.pack === slug && (!f || l.format === f));
  for (const p of catalog) {
    if (has(p.slug) && !has(p.slug, "papier") && p.print && !p.print.soldOut) {
      out.push({
        pack: p,
        line: { pack: p.slug, format: "papier", qty: 1 },
        title: `${p.shortName} · Fiches de poche`,
        subtitle: "Plastifiées, à glisser dans ta blouse · numérique offert",
        cents: p.print.priceCents,
        image: p.paperImage,
      });
    }
  }
  for (const p of catalog) {
    if (!has(p.slug)) {
      out.push({ pack: p, line: { pack: p.slug, format: "pdf", qty: 1 }, title: p.shortName, subtitle: p.tagline, cents: p.priceCents, image: p.image });
    }
  }
  return out.slice(0, max);
}

// Panier côté navigateur (localStorage), sans dépendance.
// On ne stocke QUE les identifiants (slugs) : les prix seront toujours
// recalculés côté serveur au moment du paiement (phase 4).
"use client";

const KEY = "lpi-cart-v1";
const MAX_ITEMS = 50;
const EMPTY: string[] = [];

let cache: string[] | null = null;
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string" && /^[a-z0-9-]{1,120}$/.test(s)).slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function write(items: string[]) {
  cache = items;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Navigation privée / stockage bloqué : le panier reste en mémoire pour la session.
  }
  listeners.forEach((l) => l());
}

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        cache = read();
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot(): string[] {
    if (cache === null) cache = read();
    return cache;
  },
  getServerSnapshot(): string[] {
    return EMPTY;
  },
  add(slug: string) {
    const items = cartStore.getSnapshot();
    if (!items.includes(slug)) write([...items, slug]); // produit numérique : quantité 1
  },
  remove(slug: string) {
    write(cartStore.getSnapshot().filter((s) => s !== slug));
  },
  clear() {
    write([]);
  },
};

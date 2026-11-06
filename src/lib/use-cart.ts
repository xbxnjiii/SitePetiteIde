"use client";
import { useSyncExternalStore } from "react";
import { cartStore } from "./cart-store";

export function useCart() {
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  return { items, add: cartStore.add, remove: cartStore.remove, clear: cartStore.clear };
}

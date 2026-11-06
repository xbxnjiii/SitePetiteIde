"use client";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useCart } from "@/lib/use-cart";

export function CartButton() {
  const { items } = useCart();
  const n = items.length;
  return (
    <Link href="/panier" className="icon-btn" aria-label={n ? `Panier, ${n} article${n > 1 ? "s" : ""}` : "Panier vide"}>
      <Icon name="cart" />
      {n > 0 ? <span className="cart-count" aria-hidden="true">{n}</span> : null}
    </Link>
  );
}

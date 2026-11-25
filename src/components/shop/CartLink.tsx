"use client";
import Link from "next/link";
import { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { requestBuy } from "./buy-event";
import { cartCount, clearCart, useCart } from "./cart-store";

/** Accès au panier dans l'en-tête, avec le nombre d'articles. */
export function CartLink() {
  const count = cartCount(useCart());
  return (
    <Link href="/panier" className={count ? "header__cart header__cart--full" : "header__cart"} aria-label={count ? `Mon panier, ${count} article${count > 1 ? "s" : ""}` : "Mon panier"}>
      <Icon name="cart" />
      {count ? <span className="header__cart-count">{count}</span> : null}
    </Link>
  );
}

/** Vide le panier (page « Merci » après un paiement réussi). */
export function ClearCart() {
  useEffect(() => clearCart(), []);
  return null;
}

/** Barre d'achat mobile : « Voir mon panier » dès qu'il contient un article, sinon montre les versions du pack. */
export function StickyCartAction({ label }: { label: React.ReactNode }) {
  const lines = useCart();
  const count = cartCount(lines);
  if (count) {
    return (
      <Link href="/panier" className="btn btn--primary btn--buy sticky-buy__btn">
        <Icon name="cart" /> Voir mon panier · {count} article{count > 1 ? "s" : ""}
      </Link>
    );
  }
  return (
    <button type="button" className="btn btn--primary btn--buy sticky-buy__btn" onClick={() => requestBuy()}>
      {label}
    </button>
  );
}

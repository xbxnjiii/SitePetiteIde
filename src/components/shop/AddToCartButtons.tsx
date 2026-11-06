"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useCart } from "@/lib/use-cart";

/** « Acheter maintenant » (va directement au panier) + « Ajouter au panier ». */
export function AddToCartButtons({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const { items, add } = useCart();
  const router = useRouter();
  const [toast, setToast] = useState(false);
  const inCart = items.includes(slug);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const buyNow = () => {
    add(slug);
    router.push("/panier");
  };

  if (compact) {
    return (
      <button type="button" className="btn btn--primary" onClick={buyNow}>
        Acheter maintenant
      </button>
    );
  }

  return (
    <div className="product__buy">
      <button type="button" className="btn btn--primary btn--block" onClick={buyNow}>
        Acheter maintenant
      </button>
      {inCart ? (
        <Link href="/panier" className="btn btn--secondary btn--block">
          <Icon name="check" /> Dans ton panier — voir le panier
        </Link>
      ) : (
        <button
          type="button"
          className="btn btn--secondary btn--block"
          onClick={() => {
            add(slug);
            setToast(true);
          }}
        >
          <Icon name="cart" /> Ajouter au panier
        </button>
      )}
      {toast ? (
        <div className="toast" role="status">
          Ajouté au panier ✓ <Link href="/panier">Voir le panier</Link>
        </div>
      ) : null}
    </div>
  );
}

"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Mascot } from "@/components/ui/Mascot";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/use-cart";
import { ProductCover } from "./ProductCover";

export type CartProduct = Pick<
  Product,
  "slug" | "name" | "priceCents" | "type" | "icon" | "tone" | "pageCount" | "packItems"
>;

export function CartView({ catalog }: { catalog: CartProduct[] }) {
  const { items, remove } = useCart();
  const [consent, setConsent] = useState(false);
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));
  // Les produits retirés du catalogue sont ignorés (et seront refusés au paiement).
  const lines = items.map((s) => bySlug.get(s)).filter((p): p is CartProduct => Boolean(p));
  const total = lines.reduce((sum, p) => sum + p.priceCents, 0);

  // Produit déjà inclus dans un pack du panier → on le signale.
  const includedIn = (slug: string) =>
    lines.find((p) => p.type === "pack" && p.packItems?.includes(slug))?.name;

  if (lines.length === 0) {
    return (
      <div className="empty">
        <Mascot className="mascot" />
        <h2>Ton panier est vide</h2>
        <p>Découvre nos fiches et mémos pour t&apos;accompagner pendant ta formation.</p>
        <Link href="/boutique" className="btn btn--primary">
          Découvrir la boutique
        </Link>
      </div>
    );
  }

  return (
    <div className="cart">
      <section aria-labelledby="cart-title">
        <h2 id="cart-title" className="visually-hidden">
          Articles
        </h2>
        <ul className="cart__list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {lines.map((p) => {
            const pack = includedIn(p.slug);
            return (
              <li key={p.slug} className="cart-line">
                <ProductCover product={p} />
                <div>
                  <Link href={`/produit/${p.slug}`} className="cart-line__name">
                    {p.name}
                  </Link>
                  <div className="cart-line__meta">
                    {p.type === "pack" ? `Pack · ${p.packItems?.length ?? 0} PDF` : `PDF · ${p.pageCount} pages`}
                  </div>
                  {pack ? (
                    <div className="cart-line__meta" style={{ color: "var(--c-accent-dark)" }}>
                      Déjà inclus dans « {pack} »
                    </div>
                  ) : null}
                </div>
                <div className="cart-line__side">
                  <span className="price">{formatPrice(p.priceCents)}</span>
                  <button type="button" className="link-btn" onClick={() => remove(p.slug)} aria-label={`Retirer ${p.name} du panier`}>
                    Retirer
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <p style={{ marginTop: 16 }}>
          <Link href="/boutique">← Continuer mes achats</Link>
        </p>
      </section>

      <aside className="summary" aria-labelledby="summary-title">
        <h2 id="summary-title" style={{ fontSize: "1.2rem", margin: 0 }}>
          Récapitulatif
        </h2>
        <div className="summary__row">
          <span>
            {lines.length} produit{lines.length > 1 ? "s" : ""}
          </span>
          <span>{formatPrice(total)}</span>
        </div>
        <div className="summary__row summary__total">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--c-ink-soft)", margin: 0 }}>
          Code promo saisissable à l&apos;étape du paiement.
        </p>

        <label className="consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            J&apos;accepte les <Link href="/cgv">CGV</Link> et je demande l&apos;accès immédiat aux fichiers. Je reconnais
            renoncer à mon droit de rétractation dès le début du téléchargement.
          </span>
        </label>

        {/* Paiement Stripe : branché en phase 4. Bouton volontairement inactif. */}
        <button type="button" className="btn btn--primary btn--block" disabled aria-describedby="pay-note">
          <Icon name="shield" /> Payer {formatPrice(total)}
        </button>
        <p id="pay-note" className="notice" style={{ margin: 0 }}>
          Démo : le paiement sécurisé (Stripe) sera activé à la phase 4. Aucun paiement n&apos;est possible pour l&apos;instant.
        </p>

        <ul className="product__reassure" style={{ marginTop: 0 }}>
          <li>
            <Icon name="download" /> Téléchargement immédiat + liens envoyés par email
          </li>
          <li>
            <Icon name="shield" /> Paiement sécurisé par carte, Apple Pay ou Google Pay
          </li>
        </ul>
      </aside>
    </div>
  );
}

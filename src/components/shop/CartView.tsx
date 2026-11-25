"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/format";
import { type CartLine, MAX_PAPER_QTY, lineKey } from "@/lib/cart";
import type { CatalogPack, ShopConfig } from "@/lib/catalog";
import { FREE_SHIPPING_FROM_CENTS, shippingCents } from "@/content/shipping";
import { isPhysical } from "@/content/packs";
import { CheckoutPanel } from "./PackCheckout";
import { type ShippingChoice, ShippingChooser, chosenRelay, shippingReady } from "./ShippingChooser";
import { type AddResult, type Suggestion, addToCart, removeLine, resolveCart, setQty, suggestions, useCart } from "./cart-store";

/** Libellé du format d'une ligne. */
export function lineDetail(line: CartLine, pack: CatalogPack): string {
  if (line.format === "papier") return `${pack.print?.label ?? "Fiches de poche"} · numérique offert`;
  if (line.format === "revision") return "Fiches de révision A4 · numérique offert";
  if (line.format === "complet") return "Pack complet : numérique + poche + révision";
  if (line.format === "fiches") return `À l'unité : ${(line.fiches ?? []).map((i) => pack.unit?.items[i]?.title ?? `fiche ${i + 1}`).join(", ")}`;
  return `Version numérique · ${pack.packCount} ${pack.countWord[1]}`;
}

/** Barre « Plus que X € pour la livraison offerte ». */
export function FreeShippingBar({ subtotalCents }: { subtotalCents: number }) {
  const left = FREE_SHIPPING_FROM_CENTS - subtotalCents;
  const pct = Math.min(100, Math.round((subtotalCents / FREE_SHIPPING_FROM_CENTS) * 100));
  return (
    <div className={left > 0 ? "free-ship" : "free-ship free-ship--done"}>
      <p>
        <Icon name="truck" />{" "}
        {left > 0 ? (
          <>
            Plus que <strong>{formatPrice(left)}</strong> pour la livraison Mondial Relay offerte
          </>
        ) : (
          <>
            <strong>Livraison Mondial Relay offerte</strong> 🎉
          </>
        )}
      </p>
      <span className="free-ship__bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

/** Suggestions « Tu aimeras aussi ». */
export function SuggestionList({ items, onAdd }: { items: Suggestion[]; onAdd?: (s: Suggestion, r: AddResult) => void }) {
  if (!items.length) return null;
  return (
    <ul className="suggest">
      {items.map((s) => (
        <li key={lineKey(s.line)} className="suggest__item">
          {s.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.image.src} alt="" width={s.image.width} height={s.image.height} loading="lazy" />
          ) : null}
          <Link href={`/${s.pack.slug}`} className="suggest__text">
            <strong>{s.title}</strong>
            <span>{s.subtitle}</span>
          </Link>
          <button
            type="button"
            className="btn btn--secondary btn--sm suggest__add"
            onClick={() => {
              const r = addToCart(s.line);
              onAdd?.(s, r);
            }}
          >
            + {formatPrice(s.cents)}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CartView({ config }: { config: ShopConfig }) {
  const lines = useCart();
  // Le panier vit sur l'appareil : rien à afficher avant le chargement de la page dans le navigateur.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { ok, unavailable, subtotal } = resolveCart(lines, config.catalog);
  const cart = ok.map((x) => x.line);
  const hasPrint = cart.some((l) => isPhysical(l.format));
  const [choice, setChoice] = useState<ShippingChoice>({ method: null, relays: {} });
  const relay = chosenRelay(choice);
  const ship = hasPrint && choice.method ? shippingCents(choice.method, subtotal) : 0;
  const total = subtotal + ship;
  const ready = cart.length > 0 && (!hasPrint || shippingReady(choice));

  // La session de paiement n'est recréée qu'une fois le panier stabilisé (pas à chaque clic sur + / −).
  const key = `${JSON.stringify(cart)}|${hasPrint ? choice.method?.id : ""}|${relay?.id ?? ""}`;
  const [settled, setSettled] = useState(key);
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(key), 700);
    return () => window.clearTimeout(t);
  }, [key]);

  if (!mounted) return <div className="checkout__loading" aria-label="Chargement du panier" />;

  if (!cart.length && !unavailable.length) {
    return (
      <div className="cart-empty">
        <p>Ton panier est vide pour l&apos;instant.</p>
        <Link href="/packs" className="btn btn--primary">
          Voir les packs
        </Link>
        <SuggestionList items={suggestions([], config.catalog)} />
      </div>
    );
  }

  return (
    <div className="cart">
      <ul className="cart-lines">
        {ok.map(({ line, pack, cents }) => {
          const img =
            line.format === "papier"
              ? pack.paperImage
              : line.format === "revision"
                ? (pack.revision?.image ?? pack.paperImage)
                : line.format === "complet"
                  ? (pack.bundle?.image ?? pack.paperImage)
                  : pack.image;
          const k = lineKey(line);
          return (
            <li key={k} className="cart-line">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.src} alt="" width={img.width} height={img.height} className="cart-line__img" />
              ) : null}
              <div className="cart-line__text">
                <Link href={`/${pack.slug}`}>
                  <strong>{pack.shortName}</strong>
                </Link>
                <span>{lineDetail(line, pack)}</span>
                {isPhysical(line.format) ? (
                  <div className="qty" role="group" aria-label="Quantité">
                    <button type="button" onClick={() => setQty(k, line.qty - 1)} disabled={line.qty <= 1} aria-label="Un de moins">
                      −
                    </button>
                    <output aria-live="polite">{line.qty}</output>
                    <button type="button" onClick={() => setQty(k, line.qty + 1)} disabled={line.qty >= MAX_PAPER_QTY} aria-label="Un de plus">
                      +
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="cart-line__end">
                <strong className="price">{formatPrice(cents)}</strong>
                <button type="button" className="cart-line__remove" onClick={() => removeLine(k)} aria-label={`Retirer ${pack.shortName}`}>
                  <Icon name="trash" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {unavailable.length ? (
        <div className="alert">
          {unavailable.length > 1 ? "Ces articles ne sont plus disponibles" : "Cet article n'est plus disponible"} : on les a mis de côté.{" "}
          <button type="button" className="link-btn" onClick={() => unavailable.forEach((l) => removeLine(lineKey(l)))}>
            Les retirer
          </button>
        </div>
      ) : null}

      {hasPrint ? <FreeShippingBar subtotalCents={subtotal} /> : null}

      {hasPrint ? (
        <ShippingChooser
          id="panier"
          methods={config.shippingMethods}
          subtotalCents={subtotal}
          mondialRelayBrand={config.mondialRelayBrand}
          value={choice}
          onChange={setChoice}
        />
      ) : null}

      <dl className="cart-total">
        <div>
          <dt>Sous-total</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        {hasPrint ? (
          <div>
            <dt>Livraison</dt>
            <dd>{choice.method ? (ship ? formatPrice(ship) : "Offerte") : "à choisir"}</dd>
          </div>
        ) : null}
        <div className="cart-total__sum">
          <dt>Total</dt>
          <dd className="price">{formatPrice(total)}</dd>
        </div>
      </dl>

      {!ready ? (
        <p className="buy-sheet__hint">
          {choice.method ? "Choisis ton point relais pour passer au paiement." : "Choisis ton mode de livraison pour passer au paiement."}
        </p>
      ) : settled !== key ? (
        <div className="checkout__loading" aria-label="Mise à jour du paiement" />
      ) : (
        <CheckoutPanel key={settled} cart={cart} priceCents={total} shipping={hasPrint && choice.method ? { method: choice.method, relay } : null} />
      )}

      {suggestions(cart, config.catalog).length ? (
        <section className="cart-more" aria-labelledby="cart-more-title">
          <h2 id="cart-more-title">Tu aimeras aussi</h2>
          <SuggestionList items={suggestions(cart, config.catalog)} />
        </section>
      ) : null}

      <Link href="/packs" className="cart-continue">
        ← Continuer mes achats
      </Link>
    </div>
  );
}

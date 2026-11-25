"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/format";
import { type CartLine, lineKey } from "@/lib/cart";
import type { CatalogPack, ShopConfig } from "@/lib/catalog";
import { FREE_SHIPPING_FROM_CENTS, SHIPPING_FROM_CENTS } from "@/content/shipping";
import { FichePicker } from "./PackCheckout";
import { FreeShippingBar, SuggestionList, lineDetail } from "./CartView";
import { BUY_EVENT, type BuyRequest } from "./buy-event";
import { type AddResult, addToCart, resolveCart, suggestions, useCart } from "./cart-store";

// Choix de la version (page de vente) : deux cartes produit (numérique / fiches de poche) avec « Ajouter au panier »,
// un lien discret pour l'unité. Après l'ajout : confirmation, livraison offerte et suggestions.
// Le paiement et la livraison se font sur la page /panier.

interface Photo {
  src: string;
  width: number;
  height: number;
  alt: string;
}

interface Props {
  slug: string;
  config: ShopConfig;
  /** Visuel de la carte numérique. */
  packImage: Photo | null;
  /** Photo et caractéristiques des fiches de poche. */
  paperPhoto: Photo | null;
  paperSpecs: string[];
}

type Added = { line: CartLine; note?: string; added: boolean };

export function PackOffers({ slug, config, packImage, paperPhoto, paperSpecs }: Props) {
  const pack = config.catalog.find((p) => p.slug === slug)!;
  const { print, unit } = pack;
  const paperOn = Boolean(print && !print.soldOut);
  const [added, setAdded] = useState<Added | null>(null);
  const [unitOpen, setUnitOpen] = useState<number[] | null>(null);
  const lines = useCart();
  const inCart = (f: string) => lines.some((l) => l.pack === slug && l.format === f);

  const add = (line: CartLine) => {
    const r = addToCart(line);
    setUnitOpen(null);
    setAdded({ line, ...r });
  };

  // Depuis un aperçu de fiche : choix à l'unité avec la fiche cochée ; sinon, les versions.
  useEffect(() => {
    const onBuy = (e: Event) => {
      const { fiche } = (e as CustomEvent<BuyRequest>).detail ?? {};
      if (unit && typeof fiche === "number" && fiche >= 0 && fiche < unit.items.length) setUnitOpen([fiche]);
      else requestAnimationFrame(() => document.getElementById("acheter")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };
    window.addEventListener(BUY_EVENT, onBuy);
    return () => window.removeEventListener(BUY_EVENT, onBuy);
  }, [unit]);

  return (
    <div className="offers" id="acheter" data-buy-anchor="">
      {print ? <h2 className="offers__title">Choisis ta version</h2> : null}
      <div className="offers__list">
        <article className="offer">
          {packImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="offer__img" src={packImage.src} alt="" width={packImage.width} height={packImage.height} loading="lazy" />
          ) : null}
          <div className="offer__body">
            <p className="offer__kicker">
              <Icon name="phone" /> Version numérique
            </p>
            <h3 className="offer__title">Sur ton téléphone, tout de suite</h3>
            <ul className="offer__points">
              <li>{pack.packCount} fiches en PDF et en images</li>
              <li>Reçues par email après le paiement</li>
            </ul>
          </div>
          <div className="offer__foot">
            <p className="offer__price">
              <span className="price">{formatPrice(pack.priceCents)}</span>
              <small className="offer__per">soit {formatPrice(Math.round(pack.priceCents / pack.packCount))} la fiche</small>
            </p>
            <button type="button" className="btn btn--primary btn--buy offer__btn" onClick={() => add({ pack: slug, format: "pdf", qty: 1 })}>
              {inCart("pdf") ? (
                <>
                  <Icon name="check" /> Dans le panier
                </>
              ) : (
                "Ajouter au panier"
              )}
            </button>
          </div>
        </article>

        {print ? (
          <article className={paperOn ? "offer offer--paper" : "offer offer--paper offer--off"}>
            <span className="offer__badge">Idéal en stage</span>
            {paperPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="offer__img" src={paperPhoto.src} alt="" width={paperPhoto.width} height={paperPhoto.height} loading="lazy" />
            ) : null}
            <div className="offer__body">
              <p className="offer__kicker">
                <Icon name="note" /> Fiches de poche
              </p>
              <h3 className="offer__title">À glisser dans ta blouse</h3>
              <ul className="offer__points">
                <li>{paperSpecs.join(" · ")}</li>
                <li>
                  <strong>+ version numérique offerte</strong>
                </li>
              </ul>
            </div>
            <div className="offer__foot">
              <p className="offer__price">
                <span className="price">{formatPrice(print.priceCents)}</span>
                {config.shippingMethods.length ? (
                  <small>
                    + livraison dès {formatPrice(SHIPPING_FROM_CENTS)}, offerte dès {formatPrice(FREE_SHIPPING_FROM_CENTS)}
                  </small>
                ) : null}
              </p>
              <button
                type="button"
                className="btn btn--primary btn--buy offer__btn"
                disabled={!paperOn}
                onClick={() => add({ pack: slug, format: "papier", qty: 1 })}
              >
                {paperOn ? "Ajouter au panier" : "Bientôt de retour"}
              </button>
            </div>
          </article>
        ) : null}
      </div>

      {unit ? (
        <button type="button" className="offers__unit" onClick={() => setUnitOpen([])}>
          Besoin d&apos;une seule fiche ? <span>À partir de {formatPrice(unit.priceCents)}</span>
        </button>
      ) : null}

      {unitOpen && unit ? (
        <Sheet title="Fiches à l'unité" subtitle={`${pack.shortName} · ${formatPrice(unit.priceCents)} la fiche`} image={packImage} onClose={() => setUnitOpen(null)}>
          <UnitChooser pack={pack} initial={unitOpen} onAdd={(fiches) => add({ pack: slug, format: "fiches", qty: 1, fiches })} onPickPack={() => add({ pack: slug, format: "pdf", qty: 1 })} />
        </Sheet>
      ) : null}

      {added ? (
        <AddedSheet
          key={lineKey(added.line)}
          added={added}
          pack={config.catalog.find((p) => p.slug === added.line.pack) ?? pack}
          config={config}
          onAdded={(line, r) => setAdded({ line, ...r })}
          onClose={() => setAdded(null)}
        />
      ) : null}
    </div>
  );
}

/** Choix des fiches à l'unité, puis « Ajouter au panier ». */
function UnitChooser({ pack, initial, onAdd, onPickPack }: { pack: CatalogPack; initial: number[]; onAdd: (f: number[]) => void; onPickPack: () => void }) {
  const [picked, setPicked] = useState(initial);
  const unit = pack.unit!;
  return (
    <>
      <FichePicker
        unit={{ priceCents: unit.priceCents, items: unit.items, packCount: pack.packCount }}
        packCents={pack.priceCents}
        picked={picked}
        onChange={setPicked}
        onPickPack={onPickPack}
      />
      <button type="button" className="btn btn--primary btn--block btn--buy" disabled={!picked.length} onClick={() => onAdd(picked)}>
        {picked.length ? `Ajouter ${picked.length > 1 ? `ces ${picked.length} fiches` : "cette fiche"} au panier · ${formatPrice(unit.priceCents * picked.length)}` : "Choisis au moins une fiche"}
      </button>
    </>
  );
}

/** Confirmation d'ajout : l'article, la livraison offerte, « Voir mon panier » et des suggestions. */
function AddedSheet({
  added,
  pack,
  config,
  onAdded,
  onClose,
}: {
  added: Added;
  pack: CatalogPack;
  config: ShopConfig;
  onAdded: (line: CartLine, r: AddResult) => void;
  onClose: () => void;
}) {
  const lines = useCart();
  const { subtotal } = resolveCart(lines, config.catalog);
  const hasPrint = lines.some((l) => l.format === "papier");
  const img = added.line.format === "papier" ? pack.paperImage : pack.image;
  const more = suggestions(lines, config.catalog).filter((s) => lineKey(s.line) !== lineKey(added.line));
  return (
    <Sheet title={added.added ? "Ajouté à ton panier" : "Déjà dans ton panier"} icon={added.added ? "check" : undefined} onClose={onClose}>
      <div className="added">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.src} alt="" width={img.width} height={img.height} />
        ) : null}
        <p>
          <strong>{pack.shortName}</strong>
          <span>{lineDetail(added.line, pack)}</span>
        </p>
      </div>
      {added.note ? <p className="notice">{added.note}</p> : null}
      {hasPrint ? <FreeShippingBar subtotalCents={subtotal} /> : null}
      <div className="added__actions">
        <Link href="/panier" className="btn btn--primary btn--block">
          <Icon name="cart" /> Voir mon panier · {formatPrice(subtotal)}
        </Link>
        <button type="button" className="btn btn--secondary btn--block" onClick={onClose}>
          Continuer mes achats
        </button>
      </div>
      {more.length ? (
        <div className="added__more">
          <p className="added__more-title">Tu aimeras aussi</p>
          <SuggestionList items={more} onAdd={(s, r) => onAdded(s.line, r)} />
        </div>
      ) : null}
    </Sheet>
  );
}

/** Fenêtre bas d'écran (centrée sur ordinateur), en-tête et croix toujours visibles. */
function Sheet({
  title,
  subtitle,
  image,
  icon,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  image?: Photo | null;
  icon?: "check";
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, []);
  return (
    <div className="modal buy-sheet" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__panel" role="dialog" aria-modal="true" aria-labelledby="buy-sheet-title" tabIndex={-1} ref={panel}>
        <div className="buy-sheet__head">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="buy-sheet__thumb" src={image.src} alt="" width={image.width} height={image.height} />
          ) : icon ? (
            <span className="buy-sheet__ok" aria-hidden="true">
              <Icon name={icon} />
            </span>
          ) : null}
          <div className="buy-sheet__what">
            <h2 id="buy-sheet-title">{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

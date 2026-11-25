"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon, type UiIcon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/format";
import { type CartLine, lineKey } from "@/lib/cart";
import type { CatalogPack, ShopConfig } from "@/lib/catalog";
import { isPhysical } from "@/content/packs";
import { IS_PREPROD } from "@/lib/format";
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
  /** Caractéristiques des fiches de révision. */
  revisionSpecs?: string[];
}

type Added = { line: CartLine; note?: string; added: boolean };

export function PackOffers({ slug, config, packImage, paperPhoto, paperSpecs, revisionSpecs = [] }: Props) {
  const pack = config.catalog.find((p) => p.slug === slug)!;
  const { print, unit, revision, bundle } = pack;
  const paperOn = Boolean(print && !print.soldOut);
  const [added, setAdded] = useState<Added | null>(null);
  const [unitOpen, setUnitOpen] = useState<number[] | null>(null);
  const lines = useCart();
  const inCart = (f: string) => lines.some((l) => l.pack === slug && l.format === f);

  // Produits proposés, dans l'ordre d'affichage : pack complet, numérique, fiches de poche, fiches de révision.
  const products: Product[] = [];
  if (bundle) {
    const separate = print && revision ? pack.priceCents + print.priceCents + revision.priceCents : 0;
    products.push({
      format: "complet",
      icon: "gift",
      kicker: "Pack complet",
      title: "Tout pour réussir",
      short: "Numérique + poche + révision",
      points: ["Numérique + fiches de poche + fiches de révision"],
      priceCents: bundle.priceCents,
      note: "+ Livraison",
      save: separate > bundle.priceCents ? `Tu économises ${formatPrice(separate - bundle.priceCents)}` : undefined,
      image: bundle.image,
      badge: "Meilleure offre",
      badgeCls: "offer__badge--bundle",
      listBadge: true,
      cls: "offer--bundle",
      gift: false,
      shipped: true,
      available: !bundle.soldOut,
    });
  }
  products.push({
    format: "pdf",
    icon: "phone",
    kicker: "Version numérique",
    title: "Sur ton téléphone, tout de suite",
    short: `${pack.packCount} fiches · PDF et images`,
    points: [`${pack.packCount} fiches en PDF et en images`, "Reçues par email après le paiement"],
    priceCents: pack.priceCents,
    note: `soit ${formatPrice(Math.round(pack.priceCents / pack.packCount))} la fiche`,
    noteCls: "offer__per",
    image: packImage,
    cls: "",
    gift: false,
    shipped: false,
    available: true,
  });
  if (print) {
    products.push({
      format: "papier",
      icon: "note",
      kicker: "Fiches de poche",
      title: "À glisser dans ta blouse",
      short: "Plastifiées, pour ta blouse",
      points: [paperSpecs.join(" · ")],
      priceCents: print.priceCents,
      note: "+ Livraison",
      image: paperPhoto,
      badge: "Idéal en stage",
      badgeCls: "",
      cls: "offer--paper",
      gift: true,
      shipped: true,
      available: paperOn,
    });
  }
  if (revision) {
    products.push({
      format: "revision",
      icon: "note",
      kicker: "Fiches de révision",
      title: "Complète, corrige, recommence",
      short: "A4 à compléter, verso corrigé",
      points: [revisionSpecs.join(" · ")],
      priceCents: revision.priceCents,
      note: "+ Livraison",
      image: revision.image,
      badge: "Pour réviser",
      badgeCls: "offer__badge--revision",
      cls: "offer--revision",
      gift: true,
      shipped: true,
      available: !revision.soldOut,
    });
  }

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
      {print || revision ? <h2 className="offers__title">Choisis ta version</h2> : null}
      {IS_PREPROD ? (
        <OfferPicker products={products} onAdd={(f) => add({ pack: slug, format: f, qty: 1 })} inCart={inCart} />
      ) : (
        <div className="offers__list">
          {products.map((p) => (
            <article key={p.format} className={`offer ${p.cls}${p.available ? "" : " offer--off"}`}>
              {p.badge ? <span className={`offer__badge ${p.badgeCls}`}>{p.badge}</span> : null}
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="offer__img" src={p.image.src} alt="" width={p.image.width} height={p.image.height} loading="lazy" />
              ) : null}
              <div className="offer__body">
                <p className="offer__kicker">
                  <Icon name={p.icon} /> {p.kicker}
                </p>
                <h3 className="offer__title">{p.title}</h3>
                <ul className="offer__points">
                  {p.points.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                {p.gift ? (
                  <span className="offer__gift">
                    <Icon name="phone" /> Numérique offert
                  </span>
                ) : null}
                {p.save ? (
                  <span className="offer__gift">
                    <Icon name="tag" /> {p.save}
                  </span>
                ) : null}
              </div>
              <div className="offer__foot">
                <p className="offer__price">
                  <span className="price">{formatPrice(p.priceCents)}</span>
                  {p.note ? <small className={p.noteCls}>{p.note}</small> : null}
                </p>
                <AddButton available={p.available} inCart={inCart(p.format)} onClick={() => add({ pack: slug, format: p.format, qty: 1 })} />
              </div>
            </article>
          ))}
        </div>
      )}

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
  const hasPrint = lines.some((l) => isPhysical(l.format));
  const img =
    added.line.format === "papier"
      ? pack.paperImage
      : added.line.format === "revision"
        ? (pack.revision?.image ?? pack.paperImage)
        : added.line.format === "complet"
          ? (pack.bundle?.image ?? pack.paperImage)
          : pack.image;
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


interface Product {
  format: "pdf" | "papier" | "revision" | "complet";
  icon: UiIcon;
  kicker: string;
  title: string;
  /** Résumé d'une ligne (version liste). */
  short: string;
  points: string[];
  priceCents: number;
  note?: string;
  noteCls?: string;
  /** Économie du pack complet (pastille). */
  save?: string;
  /** Badge affiché dans la version liste (sinon : seulement sur les cartes). */
  listBadge?: boolean;
  image: { src: string; width: number; height: number } | null;
  badge?: string;
  badgeCls?: string;
  cls: string;
  /** Version numérique offerte avec ce format. */
  gift: boolean;
  shipped: boolean;
  available: boolean;
}

/** Bouton d'ajout compact : icône panier + « Ajouter », « Ajouté » une fois dans le panier. */
function AddButton({ available, inCart, onClick }: { available: boolean; inCart: boolean; onClick: () => void }) {
  if (!available) return <span className="add-btn add-btn--off">Bientôt</span>;
  return (
    <button type="button" className={inCart ? "add-btn add-btn--in" : "add-btn"} onClick={onClick} aria-label={inCart ? "Ajouter encore au panier" : "Ajouter au panier"}>
      <Icon name={inCart ? "check" : "cart"} /> {inCart ? "Ajouté" : "Ajouter"}
    </button>
  );
}

/**
 * Version « liste » (préprod) : une ligne par produit (vignette, nom, une info, prix), on en choisit une,
 * puis un seul bouton d'ajout. Moins d'informations à lire d'un coup.
 */
function OfferPicker({ products, onAdd, inCart }: { products: Product[]; onAdd: (f: Product["format"]) => void; inCart: (f: string) => boolean }) {
  const first = products.find((p) => p.available) ?? products[0];
  const [sel, setSel] = useState<Product["format"]>(first.format);
  const cur = products.find((p) => p.format === sel) ?? first;
  return (
    <div className="pick">
      <div className="pick__list" role="radiogroup" aria-label="Choisis ta version">
        {products.map((p) => (
          <button
            key={p.format}
            type="button"
            role="radio"
            aria-checked={sel === p.format}
            disabled={!p.available}
            className={`pick__row${sel === p.format ? " pick__row--on" : ""}`}
            onClick={() => setSel(p.format)}
          >
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image.src} alt="" width={p.image.width} height={p.image.height} loading="lazy" />
            ) : null}
            <span className="pick__text">
              <strong>
                {p.kicker}
                {p.badge && p.listBadge ? <em>{p.badge}</em> : null}
              </strong>
              <span>{p.short}</span>
            </span>
            <span className="pick__price">
              {formatPrice(p.priceCents)}
              {p.shipped ? <small>+ Livraison</small> : null}
            </span>
          </button>
        ))}
      </div>
      <p className="pick__detail">
        {cur.gift ? (
          <span className="offer__gift">
            <Icon name="phone" /> Numérique offert
          </span>
        ) : null}
        {cur.save ? (
          <span className="offer__gift">
            <Icon name="tag" /> {cur.save}
          </span>
        ) : null}
      </p>
      <button type="button" className="btn btn--primary btn--block btn--buy pick__cta" disabled={!cur.available} onClick={() => onAdd(cur.format)}>
        <Icon name={inCart(cur.format) ? "check" : "cart"} /> {inCart(cur.format) ? "Ajouter encore" : "Ajouter au panier"} · {formatPrice(cur.priceCents)}
      </button>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { SortSelect } from "@/components/shop/SortSelect";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Icon } from "@/components/ui/Icon";
import { Mascot } from "@/components/ui/Mascot";
import { getCategories, getProducts, isSortOption } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Boutique — fiches, mémos et outils IFSI",
  description: "Toutes les ressources La Petite IDE : fiches de révision, fiches de soins, gestes techniques, mémos et packs en PDF.",
  alternates: { canonical: "/boutique" },
};

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ShopPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const q = one(sp.q)?.trim().slice(0, 80) || undefined;
  const tri = one(sp.tri);
  const sort = isSortOption(tri) ? tri : "populaires";
  const categories = await getCategories();
  const catParam = one(sp.categorie);
  const category = categories.find((c) => c.slug === catParam)?.slug;
  const products = await getProducts({ q, category, sort });

  const chipHref = (slug?: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (slug) p.set("categorie", slug);
    if (sort !== "populaires") p.set("tri", sort);
    const s = p.toString();
    return s ? `/boutique?${s}` : "/boutique";
  };

  return (
    <div className="container">
      <header className="page-head">
        <Breadcrumb items={[{ label: "Boutique" }]} />
        <h1>La boutique</h1>
        <p>Fiches, mémos et outils en PDF, à télécharger immédiatement après ton achat.</p>
      </header>

      <div className="filters">
        <form role="search" action="/boutique" className="search">
          <Icon name="search" />
          <label htmlFor="q" className="visually-hidden">Rechercher un produit</label>
          <input id="q" name="q" type="search" className="input" placeholder="Rechercher une fiche, un mémo…" defaultValue={q} enterKeyHint="search" />
          {category ? <input type="hidden" name="categorie" value={category} /> : null}
          {sort !== "populaires" ? <input type="hidden" name="tri" value={sort} /> : null}
        </form>
        <div className="filters__row">
          <span className="filters__count" aria-live="polite">
            {products.length} résultat{products.length > 1 ? "s" : ""}
          </span>
          <Suspense>
            <SortSelect value={sort} />
          </Suspense>
        </div>
        <nav className="chips" aria-label="Filtrer par catégorie">
          <Link href={chipHref()} className="chip" aria-current={!category ? "true" : undefined}>
            Tout
          </Link>
          {categories.map((c) => (
            <Link key={c.slug} href={chipHref(c.slug)} className="chip" aria-current={category === c.slug ? "true" : undefined}>
              {c.name}
            </Link>
          ))}
        </nav>
      </div>

      <section className="section" style={{ paddingTop: 0 }} aria-label="Produits">
        {products.length ? (
          <ProductGrid products={products} />
        ) : (
          <div className="empty">
            <Mascot className="mascot" />
            <h2>Aucun résultat{q ? ` pour « ${q} »` : ""}</h2>
            <p>Essaie un autre mot-clé ou explore toutes nos ressources.</p>
            <Link href="/boutique" className="btn btn--primary">Voir tous les produits</Link>
          </div>
        )}
      </section>
    </div>
  );
}

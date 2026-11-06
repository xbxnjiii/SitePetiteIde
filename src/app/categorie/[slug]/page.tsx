import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getCategories, getCategory, getProducts } from "@/lib/catalog";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  if (!category) return {};
  return {
    title: category.name,
    description: category.description,
    alternates: { canonical: `/categorie/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const [products, categories] = await Promise.all([getProducts({ category: slug }), getCategories()]);

  return (
    <div className="container">
      <header className="page-head">
        <Breadcrumb items={[{ label: "Boutique", href: "/boutique" }, { label: category.name }]} />
        <h1>{category.name}</h1>
        <p>{category.description}</p>
      </header>
      <nav className="chips" aria-label="Autres catégories" style={{ marginBlock: "8px 24px" }}>
        {categories.map((c) => (
          <Link key={c.slug} href={`/categorie/${c.slug}`} className="chip" aria-current={c.slug === slug ? "true" : undefined}>
            {c.name}
          </Link>
        ))}
      </nav>
      <section className="section" style={{ paddingTop: 0 }} aria-label={`Produits : ${category.name}`}>
        {products.length ? (
          <ProductGrid products={products} />
        ) : (
          <div className="empty">
            <h2>Bientôt disponible</h2>
            <p>De nouvelles ressources arrivent dans cette catégorie.</p>
            <Link href="/boutique" className="btn btn--primary">Voir la boutique</Link>
          </div>
        )}
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Packs et collections",
  description: "Nos ressources IFSI regroupées par thème, à prix réduit : un seul achat, tous les PDF.",
  alternates: { canonical: "/packs" },
};

export default async function PacksPage() {
  const packs = await getProducts({ type: "pack" });
  return (
    <div className="container">
      <header className="page-head">
        <Breadcrumb items={[{ label: "Packs et collections" }]} />
        <h1>Packs et collections</h1>
        <p>Un seul achat pour obtenir plusieurs PDF sur un même thème, à un prix plus doux qu&apos;à l&apos;unité.</p>
      </header>
      <section className="section" style={{ paddingTop: 16 }} aria-label="Packs">
        <ProductGrid products={packs} />
      </section>
    </div>
  );
}

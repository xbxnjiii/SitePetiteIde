import type { Metadata } from "next";
import { CartView, type CartProduct } from "@/components/shop/CartView";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Mon panier", robots: { index: false } };

export default async function CartPage() {
  // Seules les informations d'affichage sont transmises au navigateur.
  const catalog: CartProduct[] = (await getProducts()).map((p) => ({
    slug: p.slug,
    name: p.name,
    priceCents: p.priceCents,
    type: p.type,
    icon: p.icon,
    tone: p.tone,
    pageCount: p.pageCount,
    packItems: p.packItems,
  }));
  return (
    <div className="container">
      <header className="page-head">
        <Breadcrumb items={[{ label: "Panier" }]} />
        <h1>Mon panier</h1>
      </header>
      <CartView catalog={catalog} />
    </div>
  );
}

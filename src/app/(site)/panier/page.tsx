import type { Metadata } from "next";
import { Suspense } from "react";
import { CartView } from "@/components/shop/CartView";
import { CheckoutError } from "@/components/shop/CheckoutError";
import { shopConfig } from "@/lib/catalog";
import { getEnvAsync } from "@/lib/env";

export const metadata: Metadata = { title: "Mon panier", robots: { index: false, follow: false } };
// Formats en vente et modes de livraison : réglés depuis /admin.
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const config = await shopConfig(await getEnvAsync());
  return (
    <div className="container cart-page">
      <h1>Mon panier</h1>
      <Suspense>
        <CheckoutError />
      </Suspense>
      <CartView config={config} />
    </div>
  );
}

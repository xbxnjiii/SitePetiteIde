// Synchronise les packs (src/content/packs.ts) avec Stripe : produit + prix TTC, pour le PDF et le papier.
// Idempotent : peut être relancé sans risque après chaque modification de prix ou de nom.
//
//   Mode test : STRIPE_SECRET_KEY=sk_test_... npm run stripe:sync
//   Production : STRIPE_SECRET_KEY=sk_live_... npm run stripe:sync
//
// (Si la variable n'est pas définie, la clé est lue dans .dev.vars.)
import { readFileSync } from "node:fs";
import Stripe from "stripe";
import { packs } from "../src/content/packs.ts";

function secretKey(): string {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY;
  try {
    const line = readFileSync(".dev.vars", "utf8").split("\n").find((l) => l.startsWith("STRIPE_SECRET_KEY="));
    if (line) return line.slice("STRIPE_SECRET_KEY=".length).trim();
  } catch {}
  throw new Error("STRIPE_SECRET_KEY introuvable (variable d'environnement ou .dev.vars)");
}

const key = secretKey();
const stripe = new Stripe(key);

console.log(`Synchronisation Stripe (${key.startsWith("sk_live") ? "PRODUCTION" : "test"})`);

// Un produit Stripe par format vendu : le PDF (clé = slug) et, s'il existe, le papier (clé = slug-papier).
const entries = packs.flatMap((pack) => [
  {
    productId: `lpi-${pack.slug}`,
    lookupKey: pack.slug,
    name: pack.name,
    description: pack.tagline,
    // Services fournis par voie électronique (taux normal). À confirmer avec le comptable.
    taxCode: "txcd_10000000",
    priceCents: pack.priceCents,
    active: pack.status === "published",
    metadata: { slug: pack.slug, format: "pdf" },
  },
  ...(pack.print
    ? [
        {
          productId: `lpi-${pack.slug}-papier`,
          lookupKey: `${pack.slug}-papier`,
          name: `${pack.name} — fiches papier`,
          description: `${pack.print.details}. PDF offert.`,
          // Biens physiques (taux normal). À confirmer avec le comptable.
          taxCode: "txcd_99999999",
          priceCents: pack.print.priceCents,
          active: pack.status === "published",
          metadata: { slug: pack.slug, format: "papier" },
        },
      ]
    : []),
]);

for (const e of entries) {
  const productData = { name: e.name, description: e.description, tax_code: e.taxCode, active: e.active, metadata: e.metadata };

  let product: Stripe.Product;
  try {
    product = await stripe.products.update(e.productId, productData);
    console.log(`✓ produit mis à jour : ${product.id}`);
  } catch (err) {
    if ((err as Stripe.errors.StripeError).code !== "resource_missing") throw err;
    product = await stripe.products.create({ id: e.productId, ...productData });
    console.log(`+ produit créé : ${product.id}`);
  }

  const { data } = await stripe.prices.list({ lookup_keys: [e.lookupKey], limit: 1 });
  const current = data[0];
  const upToDate =
    current &&
    current.active &&
    current.unit_amount === e.priceCents &&
    current.currency === "eur" &&
    current.tax_behavior === "inclusive" &&
    current.product === product.id;

  if (upToDate) {
    console.log(`✓ prix à jour : ${current.id} (${e.priceCents / 100} € TTC)`);
    continue;
  }
  const price = await stripe.prices.create({
    product: product.id,
    currency: "eur",
    unit_amount: e.priceCents,
    tax_behavior: "inclusive", // le prix affiché est le prix payé
    lookup_key: e.lookupKey,
    transfer_lookup_key: true,
  });
  if (current) await stripe.prices.update(current.id, { active: false });
  await stripe.products.update(product.id, { default_price: price.id });
  console.log(`+ nouveau prix : ${price.id} (${e.priceCents / 100} € TTC)${current ? ` — ancien prix ${current.id} désactivé` : ""}`);
}

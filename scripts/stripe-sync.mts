// Synchronise les packs (src/content/packs.ts) avec Stripe : produit + prix TTC.
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
// Services fournis par voie électronique (taux normal). À confirmer avec le comptable.
const TAX_CODE = "txcd_10000000";

console.log(`Synchronisation Stripe (${key.startsWith("sk_live") ? "PRODUCTION" : "test"})`);

for (const pack of packs) {
  const productId = `lpi-${pack.slug}`;
  const productData = {
    name: pack.name,
    description: pack.tagline,
    tax_code: TAX_CODE,
    active: pack.status === "published",
    metadata: { slug: pack.slug },
  };

  let product: Stripe.Product;
  try {
    product = await stripe.products.update(productId, productData);
    console.log(`✓ produit mis à jour : ${product.id}`);
  } catch (e) {
    if ((e as Stripe.errors.StripeError).code !== "resource_missing") throw e;
    product = await stripe.products.create({ id: productId, ...productData });
    console.log(`+ produit créé : ${product.id}`);
  }

  const { data } = await stripe.prices.list({ lookup_keys: [pack.slug], limit: 1 });
  const current = data[0];
  const upToDate =
    current &&
    current.active &&
    current.unit_amount === pack.priceCents &&
    current.currency === "eur" &&
    current.tax_behavior === "inclusive" &&
    current.product === product.id;

  if (upToDate) {
    console.log(`✓ prix à jour : ${current.id} (${pack.priceCents / 100} € TTC)`);
    continue;
  }
  const price = await stripe.prices.create({
    product: product.id,
    currency: "eur",
    unit_amount: pack.priceCents,
    tax_behavior: "inclusive", // le prix affiché est le prix payé
    lookup_key: pack.slug,
    transfer_lookup_key: true,
  });
  if (current) await stripe.prices.update(current.id, { active: false });
  await stripe.products.update(product.id, { default_price: price.id });
  console.log(`+ nouveau prix : ${price.id} (${pack.priceCents / 100} € TTC)${current ? ` — ancien prix ${current.id} désactivé` : ""}`);
}

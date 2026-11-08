// Clé PUBLIQUE Stripe (conçue pour être visible dans le navigateur, ce n'est pas un secret).
// Elle doit appartenir au même compte Stripe que STRIPE_SECRET_KEY (secret Cloudflare).
// Secours seulement : la clé utilisée est STRIPE_PUBLISHABLE_KEY (wrangler.jsonc), renvoyée par /api/checkout.
export const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  "pk_live_51UYktNIzHGfhb0teN7aYiOxJOP1DONNKzVqwhXKa1e5Ger3XHTWVIDLgMsYal3pvqYPty396kqYydmayBNa11VW700ZsON5Oxg";

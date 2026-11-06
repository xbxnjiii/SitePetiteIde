// Clé PUBLIQUE Stripe (conçue pour être visible dans le navigateur, ce n'est pas un secret).
// Elle doit appartenir au même compte Stripe que STRIPE_SECRET_KEY (secret Cloudflare).
// En local (.dev.vars avec une clé sk_test_…), définir NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_… au build.
export const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  "pk_live_51UYktNIzHGfhb0teN7aYiOxJOP1DONNKzVqwhXKa1e5Ger3XHTWVIDLgMsYal3pvqYPty396kqYydmayBNa11VW700ZsON5Oxg";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export const formatPrice = (cents: number) => euro.format(cents / 100);

export const SITE = {
  name: "La Petite IDE",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://lapetiteide.fr",
  description: "Fiches mémo et packs de révision pour les étudiants en soins infirmiers. Paiement sécurisé, fiches en PDF et en images reçues par email, ou en format papier.",
  social: {
    tiktok: "https://www.tiktok.com/@lapetiteide.fr",
    instagram: "https://www.instagram.com/lapetiteide.fr",
  },
  contactEmail: "contact@lapetiteide.fr",
  /** Durée de validité des liens de téléchargement (jours après l'achat). */
  downloadDays: 30,
};

/**
 * Préprod (preprod.lapetiteide.fr) : variable de build NEXT_PUBLIC_SITE_ENV=preprod.
 * Bloque l'indexation (quel que soit LAUNCHED) et coupe les statistiques de visites.
 */
export const IS_PREPROD = process.env.NEXT_PUBLIC_SITE_ENV === "preprod";

/**
 * Passer `LAUNCHED` à `true` au lancement : autorise l'indexation par les
 * moteurs de recherche (jamais en préprod).
 */
const LAUNCHED = false;
export const IS_LIVE = LAUNCHED && !IS_PREPROD;

/**
 * Cloudflare Web Analytics (statistiques de visites anonymes, sans cookie).
 * Laisser vide si l'injection automatique est activée dans Cloudflare ;
 * sinon coller ici le « token » du site (Cloudflare → Web Analytics → Manage site → JS snippet).
 */
export const CF_WEB_ANALYTICS_TOKEN = IS_PREPROD ? "" : "f0ac438bf6aa4e05b72f60397065915a";

/** Informations légales de l'éditeur (mentions légales, CGV, confidentialité). */
export const LEGAL = {
  owner: "Benjamin MAYER",
  status: "Entrepreneur individuel (EI) — micro-entreprise",
  tradeName: "La Petite IDE",
  address: "97 Grande Rue, 88600 Sercœur, France",
  siren: "991 674 730",
  siret: "991 674 730 00015",
  naf: "4791A",
  vat: "TVA non applicable, art. 293 B du CGI",
  email: "contact@lapetiteide.fr",
  phone: "06 77 91 86 29",
  phoneHref: "+33677918629",
  updatedAt: "6 novembre 2026",
};

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export const formatPrice = (cents: number) => euro.format(cents / 100);

export const SITE = {
  name: "La Petite IDE",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://lapetiteide.fr",
  description: "Fiches mémo et packs de révision pour les étudiants en soins infirmiers. Paiement sécurisé, PDF reçu par email.",
  social: {
    tiktok: "https://www.tiktok.com/@lapetiteide.fr",
    instagram: "https://www.instagram.com/lapetiteide.fr",
  },
  contactEmail: "contact@lapetiteide.fr",
  /** Durée de validité des liens de téléchargement (jours après l'achat). */
  downloadDays: 30,
};

/**
 * Passer à `true` au lancement : retire le bandeau « mode test » et autorise
 * l'indexation par les moteurs de recherche.
 */
export const IS_LIVE = false;

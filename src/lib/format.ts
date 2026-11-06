const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export const formatPrice = (cents: number) => euro.format(cents / 100);

export const SITE = {
  name: "La Petite IDE",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://lapetiteide.fr",
  description:
    "Fiches de révision, mémos et outils pratiques pour les étudiants en soins infirmiers (IFSI). Téléchargement immédiat en PDF.",
  // À compléter avec les vrais comptes (cf. questions ouvertes).
  social: {
    tiktok: "https://www.tiktok.com/",
    instagram: "https://www.instagram.com/",
  },
  contactEmail: "contact@lapetiteide.fr",
};

// ============================================================================
//  CATALOGUE DES PACKS — c'est ici qu'on ajoute ou modifie un pack.
// ----------------------------------------------------------------------------
//  - Le prix affiché (priceCents) doit être identique au prix Stripe :
//    après une modification, lancer `npm run stripe:sync` (voir README).
//  - Les PDF sont stockés dans le bucket Cloudflare R2 privé, sous la clé
//    indiquée dans `files[].key`.
//  ⚠️ Textes provisoires à relire et valider par La Petite IDE.
// ============================================================================

export type IconName = "heart" | "lungs" | "thermo" | "gauge" | "drop" | "layers" | "note" | "syringe" | "book";
export type Tone = "blue" | "sky" | "pink";

export interface PackItem {
  title: string;
  icon: IconName;
  description: string;
}

export interface PackFile {
  /** Clé de l'objet dans le bucket R2 privé. */
  key: string;
  /** Nom du fichier reçu par le client. */
  downloadName: string;
  label: string;
}

export interface PackImages {
  /** Visuel carré (page d'accueil « lien en bio »), dans public/. */
  card: string;
  /** Visuel détaillé (page de vente), dans public/. */
  sale: string;
  /** Dimensions du visuel de vente [largeur, hauteur]. */
  saleSize: [number, number];
  /** Image de partage réseaux sociaux (1200×630), dans public/. */
  og?: string;
  alt: string;
}

export interface Pack {
  slug: string;
  name: string;
  /** Titre principal de la page de vente : le bénéfice, pas le nom du produit. */
  headline: string;
  /** Promesse en une ou deux phrases sous le titre. */
  promise: string;
  /** Phrase courte pour la carte de la page « lien en bio ». */
  tagline: string;
  description: string;
  priceCents: number;
  compareAtPriceCents?: number;
  badge?: string;
  icon: IconName;
  tone: Tone;
  /** Visuels officiels. Sans visuel, une couverture provisoire est générée. */
  images?: PackImages;
  /** Ce que contient le pack (affiché sur la page de vente). */
  items: PackItem[];
  /** 3 points forts courts, affichés sous le titre de la page de vente. */
  highlights: string[];
  /** Fichiers livrés après paiement. */
  files: PackFile[];
  /** Caractéristiques affichées (pages, format…). Laisser vide si inconnu. */
  pageCount?: number;
  /** Statut : seuls les packs "published" sont visibles et achetables. */
  status: "published" | "draft";
}

export const packs: Pack[] = [
  {
    slug: "pack-des-constantes",
    name: "Pack des constantes",
    headline: "Les constantes à mémoriser en 1 clin d'œil 👁️",
    promise: "6 fiches mémo ultra-visuelles pour réviser l'essentiel, sans rien de superflu.",
    tagline: "6 fiches mémo pour réviser les paramètres vitaux.",
    description:
      "Un mémo clair et synthétique pour chaque paramètre vital : valeurs normales, technique de mesure et signes d'alerte. Conçu pour réviser vite et bien, sur téléphone ou imprimé.",
    priceCents: 299,
    icon: "heart",
    tone: "pink",
    images: {
      card: "/img/packs/pack-des-constantes-carre.webp",
      sale: "/img/packs/pack-des-constantes-vente.webp",
      saleSize: [1199, 1312],
      og: "/img/packs/pack-des-constantes-og.jpg",
      alt: "Pack Les Constantes : 6 fiches mémos — fréquence cardiaque, fréquence respiratoire, température, tension artérielle, glycémie et saturation (SpO2)",
    },
    items: [
      { title: "Fréquence cardiaque", icon: "heart", description: "Normes, prise de pouls, tachycardie et bradycardie." },
      { title: "Fréquence respiratoire", icon: "lungs", description: "Compter, observer, repérer une détresse respiratoire." },
      { title: "Température", icon: "thermo", description: "Méthodes de prise, valeurs repères, conduite à tenir." },
      { title: "Tension artérielle", icon: "gauge", description: "Mesure pas à pas et erreurs fréquentes à éviter." },
      { title: "Glycémie capillaire", icon: "drop", description: "Le geste, les valeurs repères, hypo et hyperglycémie." },
      { title: "Saturation (SpO2)", icon: "lungs", description: "Pose de l'oxymètre, interprétation et limites." },
    ],
    highlights: [
      "Valeurs normales et signes d'alerte",
      "Une fiche par constante, l'essentiel en un coup d'œil",
      "Couleurs et repères visuels pour retenir plus vite",
    ],
    files: [
      {
        key: "pack-des-constantes/pack-des-constantes.pdf",
        downloadName: "La-Petite-IDE-Pack-des-constantes.pdf",
        label: "Pack des constantes (PDF)",
      },
    ],
    status: "published",
  },
];

export const publishedPacks = () => packs.filter((p) => p.status === "published");
export const getPack = (slug: string) => publishedPacks().find((p) => p.slug === slug);

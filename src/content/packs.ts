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

/** Format choisi à l'achat : PDF seul, ou fiches papier avec le PDF offert. */
export type PackFormat = "pdf" | "papier";

/** Version papier d'un pack (expédiée, avec le PDF offert). */
export interface PrintEdition {
  /** Prix TTC des fiches papier, hors frais de port (voir src/content/shipping.ts). */
  priceCents: number;
  /** Caractéristiques affichées sous le choix du format (format, papier, finition…). */
  details: string;
  /** `true` : affiché « Bientôt de retour » et non achetable. */
  soldOut?: boolean;
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
  /** Fiche bonus incluse dans le pack (mise en avant sur la page de liens et la page de vente). */
  bonus?: { title: string; text: string };
  /** 3 points forts courts, affichés sous le titre de la page de vente. */
  highlights: string[];
  /** Fichiers livrés après paiement (aussi offerts avec la version papier). */
  files: PackFile[];
  /** Version papier. Sans ce champ, le pack n'existe qu'en PDF. */
  print?: PrintEdition;
  /** Caractéristiques affichées (pages, format…). Laisser vide si inconnu. */
  pageCount?: number;
  /** Statut : seuls les packs "published" sont visibles et achetables. */
  status: "published" | "draft";
}

export const packs: Pack[] = [
  {
    slug: "pack-des-constantes",
    name: "Pack Mémos : Constantes",
    headline: "Les constantes à mémoriser en 1 clin d'œil 👁️",
    promise: "7 fiches mémo ultra-visuelles pour réviser l'essentiel, sans rien de superflu.",
    tagline: "7 fiches mémo pour réviser les paramètres vitaux.",
    bonus: {
      title: "Fiche spéciale « La Petite IDE »",
      text: "Introuvable ailleurs : des astuces d'étudiants pour mémoriser durablement les valeurs et les retrouver facilement.",
    },
    description:
      "Un mémo clair et synthétique pour chaque paramètre vital : valeurs normales, technique de mesure et signes d'alerte. Conçu pour réviser vite et bien, sur téléphone ou imprimé.",
    priceCents: 299,
    icon: "heart",
    tone: "pink",
    images: {
      card: "/img/packs/pack-constantes-v2-carre.webp",
      sale: "/img/packs/pack-constantes-v3-detail.webp",
      saleSize: [1100, 1100],
      og: "/img/packs/pack-constantes-v2-og.jpg",
      alt: "Pack Mémos : Constantes — 8 fiches : fréquence cardiaque, fréquence respiratoire, température, tension artérielle, glycémie, saturation (SpO2), diurèse et une fiche bonus pour mieux apprendre",
    },
    // Liste des fiches (non affichée sur le site : le visuel détaillé la présente).
    items: [
      { title: "Fréquence cardiaque", icon: "heart", description: "Normes, prise de pouls, tachycardie et bradycardie." },
      { title: "Fréquence respiratoire", icon: "lungs", description: "Compter, observer, repérer une détresse respiratoire." },
      { title: "Température", icon: "thermo", description: "Méthodes de prise, valeurs repères, conduite à tenir." },
      { title: "Tension artérielle", icon: "gauge", description: "Mesure pas à pas et erreurs fréquentes à éviter." },
      { title: "Glycémie capillaire", icon: "drop", description: "Le geste, les valeurs repères, hypo et hyperglycémie." },
      { title: "Saturation (SpO2)", icon: "lungs", description: "Pose de l'oxymètre, interprétation et limites." },
      { title: "Diurèse", icon: "drop", description: "Surveillance des urines, valeurs repères et signes d'alerte." },
    ],
    highlights: [
      "Valeurs normales et signes d'alerte",
      "Une fiche par constante",
      "Couleurs et repères visuels",
    ],
    files: [
      {
        key: "pack-des-constantes/pack-des-constantes.pdf",
        downloadName: "La-Petite-IDE-Pack-Memos-Constantes.pdf",
        label: "Pack Mémos : Constantes (PDF)",
      },
    ],
    // ⚠️ Prix et caractéristiques PROVISOIRES, à valider par La Petite IDE.
    print: {
      priceCents: 990,
      details: "8 fiches A6 cartonnées et plastifiées, coins arrondis",
    },
    status: "published",
  },
];

export const publishedPacks = () => packs.filter((p) => p.status === "published");
export const getPack = (slug: string) => publishedPacks().find((p) => p.slug === slug);

/** Prix TTC d'un format (hors frais de port pour le papier). */
export const formatPriceCents = (pack: Pack, format: PackFormat) =>
  format === "papier" && pack.print ? pack.print.priceCents : pack.priceCents;

/** Le format papier est-il achetable pour ce pack ? */
export const canBuyPrint = (pack: Pack) => Boolean(pack.print && !pack.print.soldOut);

export const parseFormat = (v: unknown): PackFormat => (v === "papier" ? "papier" : "pdf");

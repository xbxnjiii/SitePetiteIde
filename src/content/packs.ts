// ============================================================================
//  CATALOGUE DES PACKS — c'est ici qu'on ajoute ou modifie un pack.
// ----------------------------------------------------------------------------
//  - Le prix affiché (priceCents) doit être identique au prix Stripe :
//    après une modification, lancer `npm run stripe:sync` (voir README).
//  - Les PDF sont stockés dans le bucket Cloudflare R2 privé, sous la clé
//    indiquée dans `files[].key`.
//  ⚠️ Textes provisoires à relire et valider par La Petite IDE.
// ============================================================================

/** Préprod (variable de build, voir src/lib/format.ts). Pas d'import : ce fichier est aussi lu par scripts/stripe-sync.mts. */
const IS_PREPROD = process.env.NEXT_PUBLIC_SITE_ENV === "preprod";

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
  /** Images supplémentaires du carrousel de la page de vente (après le visuel carré). */
  gallery?: { src: string; width: number; height: number; alt: string; label?: string }[];
}

/** Format choisi à l'achat : PDF seul, ou fiches papier avec le PDF offert. */
export type PackFormat = "pdf" | "papier";

/** Version papier d'un pack (expédiée, avec le PDF offert). */
export interface PrintEdition {
  /** Prix TTC des fiches papier, hors frais de port (voir src/content/shipping.ts). */
  priceCents: number;
  /** Caractéristiques courtes (2 à 4 mots chacune), affichées en pastilles : format, papier, finition… */
  specs: string[];
  /** Photo des fiches papier (dans public/). Uniquement une photo des VRAIES fiches La Petite IDE. */
  photo?: { src: string; width: number; height: number; alt: string };
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
  /**
   * Version « images » (une image PNG/JPG par fiche, pratique sur téléphone), livrée avec le PDF.
   * Affichées sur la page /mes-fiches ; une image absente du bucket R2 est simplement masquée.
   */
  imageFiles?: PackFile[];
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
      gallery: [
        {
          src: "/img/packs/pack-constantes-apercu-pdf.webp",
          width: 1100,
          height: 733,
          alt: "Aperçu flouté des fiches du pack Constantes",
          label: "Aperçu PDF",
        },
      ],
      alt: "Pack Mémos : Constantes — 8 fiches : fréquence cardiaque, fréquence respiratoire, température, tension artérielle, glycémie, saturation (SpO2), diurèse et une fiche bonus pour mieux apprendre",
    },
    // Liste des fiches (non affichée sur le site : le visuel détaillé la présente).
    items: [
      { title: "Fréquence cardiaque", icon: "heart", description: "Normes et alertes" },
      { title: "Fréquence respiratoire", icon: "lungs", description: "Compter, observer" },
      { title: "Température", icon: "thermo", description: "Fièvre, hypothermie" },
      { title: "Tension artérielle", icon: "gauge", description: "Mesure et repères" },
      { title: "Glycémie", icon: "drop", description: "Hypo, hyper" },
      { title: "Saturation (SpO2)", icon: "lungs", description: "Valeurs et limites" },
      { title: "Diurèse", icon: "note", description: "Volumes à connaître" },
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
      specs: ["Format A6", "Carton épais", "Plastifiées", "Coins arrondis"],
      // ⚠️ Photo d'ILLUSTRATION provisoire (ce ne sont pas nos fiches) : affichée en PRÉPROD UNIQUEMENT.
      //    À remplacer par une vraie photo des fiches Constantes, puis supprimer
      //    public/img/packs/papier-illustration-preprod.webp avant la mise en production.
      photo: IS_PREPROD
        ? { src: "/img/packs/papier-illustration-preprod.webp", width: 623, height: 653, alt: "Exemple de fiches papier (illustration)" }
        : undefined,
    },
    // Images à déposer dans le bucket R2 « la-petite-ide-pdfs », sous ces clés exactes.
    imageFiles: [
      ["01-frequence-cardiaque", "Fréquence cardiaque"],
      ["02-frequence-respiratoire", "Fréquence respiratoire"],
      ["03-temperature", "Température"],
      ["04-tension-arterielle", "Tension artérielle"],
      ["05-glycemie", "Glycémie"],
      ["06-saturation", "Saturation (SpO2)"],
      ["07-diurese", "Diurèse"],
      ["08-fiche-bonus", "Fiche bonus"],
    ].map(([name, label]) => ({
      key: `pack-des-constantes/images/${name}.png`,
      downloadName: `La-Petite-IDE-Constantes-${name}.png`,
      label,
    })),
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

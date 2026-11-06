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

export interface Pack {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  priceCents: number;
  compareAtPriceCents?: number;
  badge?: string;
  icon: IconName;
  tone: Tone;
  /** Ce que contient le pack (affiché sur la page de vente). */
  items: PackItem[];
  /** Points forts (liste « Pourquoi ce pack »). */
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
    tagline: "Les 6 mémos des paramètres vitaux, à garder dans ta poche en stage.",
    description:
      "Le pack indispensable pour tes premiers stages : un mémo clair et synthétique pour chaque paramètre vital — valeurs normales, technique de mesure et signes qui doivent t'alerter. À consulter sur ton téléphone ou à imprimer.",
    priceCents: 299,
    badge: "Nouveau",
    icon: "heart",
    tone: "pink",
    items: [
      { title: "Fréquence cardiaque", icon: "heart", description: "Normes, prise de pouls, tachycardie et bradycardie." },
      { title: "Fréquence respiratoire", icon: "lungs", description: "Compter, observer, repérer une détresse respiratoire." },
      { title: "Température", icon: "thermo", description: "Méthodes de prise, valeurs repères, conduite à tenir." },
      { title: "Tension artérielle", icon: "gauge", description: "Mesure pas à pas et erreurs fréquentes à éviter." },
      { title: "Glycémie capillaire", icon: "drop", description: "Le geste, les valeurs repères, hypo et hyperglycémie." },
      { title: "Saturation (SpO2)", icon: "lungs", description: "Pose de l'oxymètre, interprétation et limites." },
    ],
    highlights: [
      "L'essentiel de chaque constante, sans blabla",
      "Pensé pour les étudiants IFSI et les premiers stages",
      "Lisible sur téléphone, tablette ou à imprimer",
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

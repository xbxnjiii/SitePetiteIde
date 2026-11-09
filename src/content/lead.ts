// ============================================================================
//  SÉQUENCE EMAIL DU QUIZ — fiche gratuite, délais et textes des emails.
//  ⚠️ Déposer le PDF de la fiche gratuite dans R2 sous `FREE_SHEET.key`.
// ============================================================================

export const FREE_SHEET = {
  /** Clé de l'objet dans le bucket R2 privé. */
  key: "gratuit/fiche-gratuite.pdf",
  downloadName: "La-Petite-IDE-Fiche-gratuite.pdf",
  title: "ta fiche mémo gratuite",
  /** Durée de validité du lien (jours). */
  days: 30,
};

/** Délais des emails suivants (en jours après l'inscription). */
export const SEQUENCE_DELAYS = { tips: 2, offer: 5 };

/** Email 2 : conseils de révision. */
export const REVISION_TIPS = [
  {
    title: "Révise un peu, mais souvent",
    text: "10 minutes par jour valent mieux que 2 heures la veille. Relis tes fiches à J+1, J+3 puis J+7 : c'est la répétition espacée.",
  },
  {
    title: "Teste-toi au lieu de relire",
    text: "Cache la fiche et essaie de retrouver les valeurs de tête. Se tromper puis corriger, c'est ce qui ancre le mieux.",
  },
  {
    title: "Associe chaque valeur à une image",
    text: "Une couleur, un pictogramme, une situation de stage : ton cerveau retient mieux ce qu'il peut visualiser.",
  },
];

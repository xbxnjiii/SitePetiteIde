// ============================================================================
//  QUIZ — un thème par entrée de `quizzes` (en bas du fichier).
//  Thème « Les constantes » — contenu à faire valider par La Petite IDE.
//  Valeurs de référence chez l'adulte, telles qu'enseignées en IFSI.
//  `answer` = index (à partir de 0) de la bonne réponse dans `choices`.
// ============================================================================

export interface QuizQuestion {
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
}

export const QUIZ_PACK_SLUG = "pack-des-constantes";

/** Formats de quiz : questions tirées au hasard parmi toutes celles du thème. */
export const QUIZ_MODES = {
  flash: { label: "Flash Quiz", count: 10, duration: "2 min", tagline: "Les bases, en un éclair" },
  pros: { label: "Le Quiz des Pros", count: 25, duration: "5 min", tagline: "Pour viser le sans-faute" },
} as const;
export type QuizMode = keyof typeof QUIZ_MODES;

/** Nombre de questions du format « Flash » (affiché sur les pages). */
export const QUESTIONS_PER_GAME = QUIZ_MODES.flash.count;

export const quiz: QuizQuestion[] = [
  {
    question: "Quelle est la fréquence cardiaque normale d'un adulte au repos ?",
    choices: ["40 à 60 bpm", "60 à 100 bpm", "100 à 140 bpm"],
    answer: 1,
    explanation: "Au repos, la FC normale de l'adulte se situe entre 60 et 100 battements par minute.",
  },
  {
    question: "À partir de quelle fréquence cardiaque parle-t-on de tachycardie chez l'adulte ?",
    choices: ["Plus de 80 bpm", "Plus de 100 bpm", "Plus de 120 bpm"],
    answer: 1,
    explanation: "On parle de tachycardie au-delà de 100 bpm, et de bradycardie en dessous de 60 bpm.",
  },
  {
    question: "Quelle est la fréquence respiratoire normale d'un adulte ?",
    choices: ["6 à 10 cycles/min", "12 à 20 cycles/min", "25 à 35 cycles/min"],
    answer: 1,
    explanation: "Chez l'adulte, la FR normale est de 12 à 20 cycles par minute.",
  },
  {
    question: "Pendant combien de temps faut-il compter la fréquence respiratoire ?",
    choices: ["15 secondes, puis multiplier par 4", "30 secondes, puis multiplier par 2", "Une minute entière"],
    answer: 2,
    explanation: "On compte sur une minute complète, discrètement, pour ne pas modifier la respiration du patient.",
  },
  {
    question: "À partir de quelle température parle-t-on de fièvre ?",
    choices: ["37 °C", "37,5 °C", "38 °C"],
    answer: 2,
    explanation: "La fièvre se définit par une température centrale supérieure ou égale à 38 °C.",
  },
  {
    question: "À partir de quel seuil parle-t-on d'hypertension artérielle (mesure au cabinet) ?",
    choices: ["120/80 mmHg", "140/90 mmHg", "160/100 mmHg"],
    answer: 1,
    explanation: "L'HTA est définie par une pression artérielle supérieure ou égale à 140/90 mmHg.",
  },
  {
    question: "Quelle est la saturation en oxygène (SpO2) normale ?",
    choices: ["85 à 90 %", "90 à 94 %", "95 à 100 %"],
    answer: 2,
    explanation: "Chez l'adulte sain, la SpO2 normale est comprise entre 95 et 100 %.",
  },
  {
    question: "En dessous de quelle SpO2 parle-t-on d'hypoxémie ?",
    choices: ["98 %", "95 %", "90 %"],
    answer: 2,
    explanation: "Entre 90 et 95 %, on parle de désaturation ; en dessous de 90 %, d'hypoxémie.",
  },
  {
    question: "Quelle est la glycémie normale à jeun chez l'adulte ?",
    choices: ["0,40 à 0,70 g/L", "0,70 à 1,10 g/L", "1,10 à 1,40 g/L"],
    answer: 1,
    explanation: "À jeun, la glycémie normale est comprise entre 0,70 et 1,10 g/L. En dessous : hypoglycémie.",
  },
  {
    question: "En dessous de quel volume d'urines sur 24 h parle-t-on d'oligurie chez l'adulte ?",
    choices: ["100 mL", "500 mL", "1 500 mL"],
    answer: 1,
    explanation: "L'oligurie correspond à moins de 500 mL d'urines par 24 h ; l'anurie à moins de 100 mL.",
  },
  {
    question: "En dessous de quelle fréquence cardiaque parle-t-on de bradycardie chez l'adulte ?",
    choices: ["50 bpm", "60 bpm", "70 bpm"],
    answer: 1,
    explanation: "On parle de bradycardie en dessous de 60 bpm chez l'adulte.",
  },
  {
    question: "À partir de quelle fréquence respiratoire parle-t-on de tachypnée chez l'adulte ?",
    choices: ["Plus de 16 cycles/min", "Plus de 20 cycles/min", "Plus de 30 cycles/min"],
    answer: 1,
    explanation: "Au-delà de 20 cycles par minute, on parle de tachypnée.",
  },
  {
    question: "En dessous de quelle température parle-t-on d'hypothermie ?",
    choices: ["36,5 °C", "36 °C", "35 °C"],
    answer: 2,
    explanation: "L'hypothermie correspond à une température centrale inférieure à 35 °C.",
  },
  {
    question: "Quel pouls rechercher en priorité chez un adulte en situation d'urgence ?",
    choices: ["Le pouls radial", "Le pouls carotidien", "Le pouls pédieux"],
    answer: 1,
    explanation: "En urgence, on recherche le pouls carotidien (ou fémoral) : il reste perçu plus longtemps que le pouls radial.",
  },
  {
    question: "En dessous de quelle pression artérielle systolique parle-t-on d'hypotension chez l'adulte ?",
    choices: ["110 mmHg", "100 mmHg", "90 mmHg"],
    answer: 2,
    explanation: "On parle d'hypotension artérielle quand la PAS est inférieure à 90 mmHg.",
  },
  {
    question: "Un brassard trop petit pour le bras du patient a tendance à…",
    choices: ["Surestimer la tension", "Sous-estimer la tension", "Ne rien changer"],
    answer: 0,
    explanation: "Un brassard trop petit surestime la pression artérielle ; un brassard trop grand la sous-estime.",
  },
  {
    question: "En dessous de quelle glycémie parle-t-on d'hypoglycémie chez l'adulte non diabétique ?",
    choices: ["0,50 g/L", "0,70 g/L", "0,90 g/L"],
    answer: 1,
    explanation: "On parle d'hypoglycémie en dessous de 0,70 g/L.",
  },
  {
    question: "À partir de quelle glycémie à jeun (à deux reprises) parle-t-on de diabète ?",
    choices: ["1,10 g/L", "1,26 g/L", "2 g/L"],
    answer: 1,
    explanation: "Le diabète est défini par une glycémie à jeun ≥ 1,26 g/L à deux reprises (ou ≥ 2 g/L à n'importe quel moment avec des symptômes).",
  },
  {
    question: "Quelle est la diurèse normale d'un adulte sur 24 h ?",
    choices: ["200 à 500 mL", "800 mL à 1,5 L", "3 à 4 L"],
    answer: 1,
    explanation: "Chez l'adulte, la diurèse normale se situe autour de 800 mL à 1,5 L par 24 h.",
  },
  {
    question: "Lequel de ces éléments peut fausser la mesure de la SpO2 ?",
    choices: ["Un vernis à ongles foncé", "Un patient assis", "Une mesure au repos"],
    answer: 0,
    explanation: "Vernis foncé, faux ongles, extrémités froides ou mouvements peuvent fausser la mesure de l'oxymètre.",
  },
  {
    question: "Quels sont les 3 critères à évaluer lors de la prise du pouls ?",
    choices: ["Fréquence, rythme, amplitude", "Couleur, chaleur, durée", "Force, sens, volume"],
    answer: 0,
    explanation: "On évalue la fréquence, la régularité (rythme) et l'amplitude (pouls bien frappé ou filant).",
  },
  {
    question: "Où se prend le pouls radial ?",
    choices: ["Au pli du coude", "À la face antérieure du poignet, côté pouce", "Sur le dos de la main"],
    answer: 1,
    explanation: "Le pouls radial se prend à la face antérieure du poignet, du côté du pouce, avec l'index et le majeur.",
  },
  {
    question: "Si le pouls est irrégulier, pendant combien de temps le compter ?",
    choices: ["15 secondes", "30 secondes", "Une minute entière"],
    answer: 2,
    explanation: "En cas d'irrégularité, on compte sur une minute complète pour obtenir une valeur fiable.",
  },
  {
    question: "Que désigne le terme « dyspnée » ?",
    choices: ["Une difficulté à respirer", "Un arrêt de la respiration", "Une respiration lente"],
    answer: 0,
    explanation: "La dyspnée est une difficulté respiratoire ressentie par le patient.",
  },
  {
    question: "Que désigne le terme « apnée » ?",
    choices: ["Une respiration rapide", "Un arrêt de la respiration", "Une respiration bruyante"],
    answer: 1,
    explanation: "L'apnée correspond à un arrêt de la ventilation.",
  },
  {
    question: "À quelle situation est classiquement associée la respiration de Kussmaul ?",
    choices: ["Une crise d'asthme", "Une acidocétose diabétique", "Un pneumothorax"],
    answer: 1,
    explanation: "La respiration de Kussmaul (ample et profonde) est typique de l'acidose métabolique, notamment l'acidocétose diabétique.",
  },
  {
    question: "Qu'est-ce que la cyanose ?",
    choices: ["Une pâleur de la peau", "Une coloration bleutée de la peau et des muqueuses", "Une rougeur du visage"],
    answer: 1,
    explanation: "La cyanose est une coloration bleutée des téguments et des muqueuses, signe d'un manque d'oxygénation.",
  },
  {
    question: "Quelle est la température corporelle normale d'un adulte ?",
    choices: ["35 à 36 °C", "36,5 à 37,5 °C", "37,5 à 38,5 °C"],
    answer: 1,
    explanation: "Chez l'adulte, la température centrale normale se situe entre 36,5 et 37,5 °C.",
  },
  {
    question: "Les frissons accompagnent généralement quelle phase de la fièvre ?",
    choices: ["La montée de la température", "Le plateau", "La défervescence"],
    answer: 0,
    explanation: "Les frissons surviennent pendant la phase d'ascension thermique ; les sueurs plutôt lors de la défervescence.",
  },
  {
    question: "Quelle méthode de mesure est la référence pour la température centrale ?",
    choices: ["Axillaire", "Rectale", "Frontale"],
    answer: 1,
    explanation: "La voie rectale reste la référence de la température centrale, même si d'autres méthodes sont plus utilisées en pratique.",
  },
  {
    question: "Quelle tension artérielle est considérée comme optimale chez l'adulte ?",
    choices: ["Inférieure à 120/80 mmHg", "Autour de 140/90 mmHg", "Autour de 160/100 mmHg"],
    answer: 0,
    explanation: "Une pression artérielle optimale est inférieure à 120/80 mmHg.",
  },
  {
    question: "Combien de temps de repos avant une mesure de la tension artérielle ?",
    choices: ["30 secondes", "5 minutes", "30 minutes"],
    answer: 1,
    explanation: "On recommande au moins 5 minutes de repos, au calme, avant la mesure.",
  },
  {
    question: "Comment définit-on l'hypotension orthostatique ?",
    choices: ["Une baisse de la PAS ≥ 20 mmHg (ou PAD ≥ 10) dans les 3 min après le lever", "Une hausse de la TA au lever", "Une TA basse uniquement la nuit"],
    answer: 0,
    explanation: "L'hypotension orthostatique : baisse de la PAS d'au moins 20 mmHg ou de la PAD d'au moins 10 mmHg dans les 3 minutes suivant le passage debout.",
  },
  {
    question: "À quelle hauteur placer le brassard pour mesurer la TA ?",
    choices: ["À hauteur du cœur", "Au-dessus de la tête", "À hauteur de la taille"],
    answer: 0,
    explanation: "Le brassard doit être à hauteur du cœur, bras soutenu, pour une mesure fiable.",
  },
  {
    question: "En mesure manuelle, à quoi correspond la pression systolique ?",
    choices: ["Au premier bruit entendu", "À la disparition des bruits", "Au bruit le plus fort"],
    answer: 0,
    explanation: "La PAS correspond à l'apparition du premier bruit (bruits de Korotkoff) lors du dégonflage.",
  },
  {
    question: "En mesure manuelle, à quoi correspond la pression diastolique ?",
    choices: ["Au premier bruit entendu", "À la disparition des bruits", "Au bruit le plus fort"],
    answer: 1,
    explanation: "La PAD correspond à la disparition des bruits lors du dégonflage du brassard.",
  },
  {
    question: "Chez un patient BPCO, quelle SpO2 cible est souvent prescrite ?",
    choices: ["88 à 92 %", "95 à 100 %", "80 à 85 %"],
    answer: 0,
    explanation: "Chez le patient BPCO, une SpO2 cible de 88 à 92 % est fréquemment prescrite : suis toujours la prescription médicale.",
  },
  {
    question: "En plus de la SpO2, que mesure l'oxymètre de pouls ?",
    choices: ["La tension artérielle", "La fréquence cardiaque", "La température"],
    answer: 1,
    explanation: "L'oxymètre affiche aussi la fréquence du pouls.",
  },
  {
    question: "Où piquer de préférence pour une glycémie capillaire ?",
    choices: ["Au centre de la pulpe du doigt", "Sur la face latérale du bout du doigt", "Sur le pouce uniquement"],
    answer: 1,
    explanation: "On pique sur la face latérale de l'extrémité du doigt, moins douloureuse, en alternant les doigts.",
  },
  {
    question: "Lesquels de ces signes évoquent une hypoglycémie ?",
    choices: ["Sueurs, tremblements, faim", "Soif intense, urines abondantes", "Fièvre et frissons"],
    answer: 0,
    explanation: "Sueurs, tremblements, faim, pâleur, troubles du comportement : signes évocateurs d'hypoglycémie.",
  },
  {
    question: "Lesquels de ces signes évoquent une hyperglycémie ?",
    choices: ["Sueurs et tremblements", "Soif intense et urines abondantes", "Bradycardie"],
    answer: 1,
    explanation: "Soif intense (polydipsie) et urines abondantes (polyurie) évoquent une hyperglycémie.",
  },
  {
    question: "Patient conscient en hypoglycémie : que faire en premier ?",
    choices: ["Le resucrer par voie orale (environ 15 g de sucre)", "Lui faire une injection d'insuline", "Attendre 1 heure et recontrôler"],
    answer: 0,
    explanation: "Chez un patient conscient, on resucre par voie orale (environ 15 g de sucre) puis on recontrôle la glycémie, selon le protocole.",
  },
  {
    question: "1 g/L de glucose correspond environ à…",
    choices: ["1 mmol/L", "5,5 mmol/L", "10 mmol/L"],
    answer: 1,
    explanation: "1 g/L de glucose correspond environ à 5,5 mmol/L.",
  },
  {
    question: "En dessous de quel volume d'urines sur 24 h parle-t-on d'anurie ?",
    choices: ["100 mL", "500 mL", "800 mL"],
    answer: 0,
    explanation: "L'anurie correspond à moins de 100 mL d'urines par 24 h.",
  },
  {
    question: "À partir de quel volume d'urines sur 24 h parle-t-on de polyurie chez l'adulte ?",
    choices: ["1 L", "1,5 L", "3 L"],
    answer: 2,
    explanation: "On parle de polyurie au-delà d'environ 3 L d'urines par 24 h.",
  },
  {
    question: "Que désigne le terme « dysurie » ?",
    choices: ["Du sang dans les urines", "Une difficulté à uriner", "Des urines abondantes"],
    answer: 1,
    explanation: "La dysurie est une difficulté à uriner.",
  },
  {
    question: "Que désigne le terme « hématurie » ?",
    choices: ["Du sang dans les urines", "Une absence d'urines", "Des urines troubles"],
    answer: 0,
    explanation: "L'hématurie est la présence de sang dans les urines.",
  },
  {
    question: "Qu'est-ce qu'un globe vésical ?",
    choices: ["Une infection urinaire", "Une rétention d'urine dans la vessie", "Un calcul rénal"],
    answer: 1,
    explanation: "Le globe vésical est une rétention d'urine : la vessie, distendue, ne se vide pas.",
  },
  {
    question: "L'échelle numérique (EN) de la douleur va de…",
    choices: ["0 à 5", "0 à 10", "1 à 20"],
    answer: 1,
    explanation: "L'EN va de 0 (pas de douleur) à 10 (douleur maximale imaginable).",
  },
  {
    question: "Quel est le score minimal de l'échelle de Glasgow ?",
    choices: ["0", "3", "5"],
    answer: 1,
    explanation: "Le score de Glasgow va de 3 (coma profond) à 15 (conscience normale).",
  },
];

/** Message de fin selon le score. */
export function quizVerdict(score: number, total: number) {
  const ratio = score / total;
  if (ratio === 1) return { title: "Sans faute, bravo ! 🏆", text: "Tu maîtrises tes constantes. Garde-les sous la main avec le pack pour réviser en un clin d'œil." };
  if (ratio >= 0.7) return { title: "Très bien ! 💪", text: "Encore quelques valeurs à consolider : le pack te les remet en tête en un coup d'œil." };
  if (ratio >= 0.4) return { title: "Pas mal, mais… 🤔", text: "Les constantes, ça se révise ! Le pack réunit toutes les valeurs à retenir sur des fiches ultra-visuelles." };
  return { title: "Il est temps de réviser 📚", text: "Pas de panique : le pack te donne l'essentiel des constantes, fiche par fiche." };
}

export type QuizIcon = "heart" | "lungs" | "drop" | "pill" | "syringe" | "book";

export interface QuizTheme {
  slug: string;
  title: string;
  description: string;
  icon: QuizIcon;
  /** "available" = jouable ; "soon" = affiché comme « bientôt ». */
  status: "available" | "soon";
  questions: QuizQuestion[];
  /** Pack proposé à la fin du quiz. */
  packSlug?: string;
  packName?: string;
}

export const quizzes: QuizTheme[] = [
  {
    slug: "constantes",
    title: "Les constantes",
    description: "FC, FR, température, TA, SpO2, glycémie, diurèse",
    icon: "heart",
    status: "available",
    questions: quiz,
    packSlug: QUIZ_PACK_SLUG,
    packName: "Pack Mémos : Constantes",
  },
  { slug: "pathologies", title: "Les pathologies", description: "Les grandes pathologies à connaître", icon: "book", status: "soon", questions: [] },
  { slug: "arret-cardiaque", title: "L'arrêt cardiaque", description: "Reconnaître et agir", icon: "lungs", status: "soon", questions: [] },
  { slug: "diabete", title: "Le diabète", description: "Glycémie, traitements, complications", icon: "drop", status: "soon", questions: [] },
];

export const getQuiz = (slug: string) => quizzes.find((q) => q.slug === slug && q.status === "available");

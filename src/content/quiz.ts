// ============================================================================
//  QUIZ — un thème par entrée de `quizzes` (en bas du fichier).
//  Thème « Les constantes » : questions alignées sur les 7 fiches et la fiche bonus du Pack Mémos : Constantes
//  (une question n'est gardée que si sa réponse figure dans les fiches).
//  Valeurs de référence chez l'adulte, telles qu'enseignées en IFSI.
//  `answer` = index (à partir de 0) de la bonne réponse dans `choices`.
// ============================================================================

import { arretCardiaque, avc, bpco, embolie } from "./quiz-urgences";

export interface QuizQuestion {
  question: string;
  /** Fiche du pack qui traite la question (voir TOPICS). Absent = hors pack. */
  topic?: Topic;
  choices: string[];
  answer: number;
  explanation: string;
}

export const QUIZ_PACK_SLUG = "pack-des-constantes";

/** Correspondance thème de question → fiche du Pack Mémos : Constantes. */
export const TOPICS = {
  fc: "Fréquence cardiaque",
  fr: "Fréquence respiratoire",
  temp: "Température",
  ta: "Tension artérielle",
  gly: "Glycémie",
  spo2: "Saturation (SpO2)",
  diu: "Diurèse",
} as const;
export type Topic = keyof typeof TOPICS;

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
    topic: "fc",
    choices: ["40 à 60 bpm", "60 à 100 bpm", "100 à 140 bpm"],
    answer: 1,
    explanation: "Chez l'adulte au repos, la FC habituelle est de 60 à 100 battements par minute.",
  },
  {
    question: "À partir de quelle fréquence cardiaque parle-t-on de tachycardie ?",
    topic: "fc",
    choices: ["Au-dessus de 80 bpm", "Au-dessus de 100 bpm", "Au-dessus de 120 bpm"],
    answer: 1,
    explanation: "Tachycardie : au-dessus de 100 bpm, le cœur bat trop vite.",
  },
  {
    question: "En dessous de quelle fréquence cardiaque parle-t-on de bradycardie ?",
    topic: "fc",
    choices: ["50 bpm", "60 bpm", "70 bpm"],
    answer: 1,
    explanation: "Bradycardie : en dessous de 60 bpm, le cœur bat trop lentement.",
  },
  {
    question: "Où se prend le pouls radial ?",
    topic: "fc",
    choices: ["Au poignet, du côté du pouce", "Au poignet, du côté de l'auriculaire", "Au pli du coude"],
    answer: 0,
    explanation: "Le pouls radial se repère au poignet, du côté du pouce.",
  },
  {
    question: "Avec quels doigts prend-on le pouls ?",
    topic: "fc",
    choices: ["Le pouce et l'index", "L'index et le majeur", "Le pouce seul"],
    answer: 1,
    explanation: "Deux doigts : l'index et le majeur. Jamais le pouce.",
  },
  {
    question: "Pendant combien de temps compte-t-on le pouls ?",
    topic: "fc",
    choices: ["15 secondes", "30 secondes", "1 minute"],
    answer: 2,
    explanation: "On compte les battements pendant 60 secondes, soit 1 minute.",
  },
  {
    question: "En plus du chiffre, que faut-il observer en prenant le pouls ?",
    topic: "fc",
    choices: ["Le rythme et la force du pouls", "La couleur des ongles", "La température de la main"],
    answer: 0,
    explanation: "Pas que le chiffre : le rythme (régulier ou irrégulier) et la force (bien frappé ou faible).",
  },
  {
    question: "Qu'est-ce qu'une arythmie ?",
    topic: "fc",
    choices: ["Des battements du cœur irréguliers", "Un cœur qui bat trop vite", "Un arrêt du cœur"],
    answer: 0,
    explanation: "Arythmie : les battements du cœur sont irréguliers. Une irrégularité du pouls peut l'évoquer.",
  },
  {
    question: "Quelle est l'unité de la fréquence cardiaque ?",
    topic: "fc",
    choices: ["mmHg", "bpm", "cycles/min"],
    answer: 1,
    explanation: "La FC s'exprime en bpm : battements par minute.",
  },
  {
    question: "Quelle est la fréquence respiratoire normale d'un adulte au repos ?",
    topic: "fr",
    choices: ["6 à 10 cycles/min", "12 à 20 cycles/min", "25 à 35 cycles/min"],
    answer: 1,
    explanation: "Chez l'adulte au repos, la FR est de 12 à 20 cycles par minute.",
  },
  {
    question: "À quoi correspond un cycle respiratoire ?",
    topic: "fr",
    choices: ["Une inspiration + une expiration", "Une inspiration seulement", "Une minute de respiration"],
    answer: 0,
    explanation: "1 cycle = 1 inspiration + 1 expiration.",
  },
  {
    question: "Pendant combien de temps compte-t-on la fréquence respiratoire ?",
    topic: "fr",
    choices: ["15 secondes", "30 secondes", "Une minute entière"],
    answer: 2,
    explanation: "On compte les cycles pendant une minute entière, en observant les mouvements du thorax.",
  },
  {
    question: "Que faut-il observer pour mesurer la fréquence respiratoire ?",
    topic: "fr",
    choices: ["Les mouvements du thorax", "Le pouls radial", "La couleur des urines"],
    answer: 0,
    explanation: "On observe le thorax et on repère les mouvements respiratoires.",
  },
  {
    question: "À partir de quelle fréquence respiratoire parle-t-on de tachypnée ?",
    topic: "fr",
    choices: ["Plus de 16 cycles/min", "Plus de 20 cycles/min", "Plus de 30 cycles/min"],
    answer: 1,
    explanation: "Tachypnée : plus de 20 cycles par minute, la respiration est trop rapide.",
  },
  {
    question: "En dessous de quelle fréquence respiratoire parle-t-on de bradypnée ?",
    topic: "fr",
    choices: ["12 cycles/min", "16 cycles/min", "20 cycles/min"],
    answer: 0,
    explanation: "Bradypnée : moins de 12 cycles par minute, la respiration est trop lente.",
  },
  {
    question: "Que désigne le terme « dyspnée » ?",
    topic: "fr",
    choices: ["Une difficulté à respirer", "Un arrêt de la respiration", "Une respiration normale"],
    answer: 0,
    explanation: "Dyspnée = difficulté à respirer.",
  },
  {
    question: "Que désigne le terme « apnée » ?",
    topic: "fr",
    choices: ["Une respiration rapide", "Un arrêt de la respiration", "Une toux sèche"],
    answer: 1,
    explanation: "Apnée = arrêt de la respiration.",
  },
  {
    question: "Qu'est-ce qu'une respiration superficielle ?",
    topic: "fr",
    choices: ["Une respiration profonde, avec beaucoup d'air", "Une respiration peu profonde, avec peu d'air", "Une respiration irrégulière"],
    answer: 1,
    explanation: "Superficielle : respiration peu profonde, peu d'air. À l'inverse, ample : profonde, beaucoup d'air.",
  },
  {
    question: "Laquelle de ces situations peut provoquer une tachypnée ?",
    topic: "fr",
    choices: ["La fièvre", "Un sédatif", "Le sommeil"],
    answer: 0,
    explanation: "Tachypnée : effort physique, fièvre, douleur, infection…",
  },
  {
    question: "Quels médicaments peuvent provoquer une bradypnée ?",
    topic: "fr",
    choices: ["Les opioïdes et les sédatifs", "Les antibiotiques", "Les vitamines"],
    answer: 0,
    explanation: "Les opioïdes et les sédatifs peuvent ralentir la respiration.",
  },
  {
    question: "Quelle est la température normale (apyrétique) d'un adulte ?",
    topic: "temp",
    choices: ["35 à 36 °C", "36,5 à 37,5 °C", "37,5 à 38,5 °C"],
    answer: 1,
    explanation: "Apyrétique : entre 36,5 et 37,5 °C, en moyenne 37 °C.",
  },
  {
    question: "Entre quelles valeurs parle-t-on de fébricule ?",
    topic: "temp",
    choices: ["36,5 et 37,4 °C", "37,5 et 37,9 °C", "38 et 39 °C"],
    answer: 1,
    explanation: "Fébricule (petite fièvre) : entre 37,5 et 37,9 °C.",
  },
  {
    question: "À partir de quelle température parle-t-on d'hyperthermie ?",
    topic: "temp",
    choices: ["37,5 °C", "38 °C", "39 °C"],
    answer: 1,
    explanation: "Hyperthermie : à partir de 38 °C, élévation anormale de la température.",
  },
  {
    question: "En dessous de quelle température parle-t-on d'hypothermie ?",
    topic: "temp",
    choices: ["36 °C", "35 °C", "34 °C"],
    answer: 1,
    explanation: "Hypothermie : en dessous de 35 °C, diminution importante de la température.",
  },
  {
    question: "Laquelle de ces voies n'est PAS une voie de mesure de la température ?",
    topic: "temp",
    choices: ["Axillaire", "Tympanique", "Radiale"],
    answer: 2,
    explanation: "Voies de mesure : buccale, axillaire, rectale, tympanique ou frontale.",
  },
  {
    question: "Combien de temps faut-il attendre pour obtenir la mesure de la température ?",
    topic: "temp",
    choices: ["Toujours 10 minutes", "De quelques secondes à quelques minutes, selon l'appareil", "Il n'y a rien à attendre"],
    answer: 1,
    explanation: "On attend la mesure : de quelques secondes à quelques minutes selon le type d'appareil.",
  },
  {
    question: "Quelle est la valeur habituelle de la tension artérielle chez l'adulte ?",
    topic: "ta",
    choices: ["Environ 90/50 mmHg", "Environ 120/80 mmHg", "Environ 160/100 mmHg"],
    answer: 1,
    explanation: "Environ 120/80 mmHg : la TA normale se situe entre 100-139 et 60-89 mmHg.",
  },
  {
    question: "À partir de quel seuil parle-t-on d'hypertension artérielle ?",
    topic: "ta",
    choices: ["120/80 mmHg", "140/90 mmHg", "180/110 mmHg"],
    answer: 1,
    explanation: "HTA : à partir de 140/90 mmHg.",
  },
  {
    question: "En dessous de quel seuil parle-t-on d'hypotension artérielle ?",
    topic: "ta",
    choices: ["90/60 mmHg", "110/70 mmHg", "120/80 mmHg"],
    answer: 0,
    explanation: "Hypotension : en dessous de 90/60 mmHg.",
  },
  {
    question: "Combien de temps de repos avant de mesurer la tension artérielle ?",
    topic: "ta",
    choices: ["Aucun", "5 minutes", "30 minutes"],
    answer: 1,
    explanation: "Le patient est installé au repos 5 minutes, assis ou couché.",
  },
  {
    question: "Où placer le brassard ?",
    topic: "ta",
    choices: ["Sur l'avant-bras, près du poignet", "2 à 3 cm au-dessus du pli du coude, sur un bras dénudé", "Par-dessus la manche, sur l'épaule"],
    answer: 1,
    explanation: "Brassard 2 à 3 cm au-dessus du pli du coude, sur un bras dénudé, de taille adaptée au bras.",
  },
  {
    question: "À quoi correspond la pression artérielle systolique (PAS) ?",
    topic: "ta",
    choices: ["À la pression maximale, lors de la contraction du cœur", "À la pression minimale, lors du relâchement du cœur", "À la moyenne des deux"],
    answer: 0,
    explanation: "PAS : pression maximale, lors de la contraction du cœur.",
  },
  {
    question: "À quoi correspond la pression artérielle diastolique (PAD) ?",
    topic: "ta",
    choices: ["À la pression maximale, lors de la contraction du cœur", "À la pression minimale, lors du relâchement du cœur", "À la fréquence du cœur"],
    answer: 1,
    explanation: "PAD : pression minimale, lors du relâchement du cœur.",
  },
  {
    question: "Quelle est l'unité de la tension artérielle ?",
    topic: "ta",
    choices: ["mmHg", "bpm", "g/L"],
    answer: 0,
    explanation: "La TA s'exprime en mmHg (millimètres de mercure).",
  },
  {
    question: "Lequel de ces facteurs influence la tension artérielle ?",
    topic: "ta",
    choices: ["La couleur des yeux", "Le stress et la douleur", "La taille des pieds"],
    answer: 1,
    explanation: "Âge, activité physique, stress, douleur, traitements, pathologies, sel, alcool, tabac.",
  },
  {
    question: "Quelle est la glycémie normale à jeun chez l'adulte ?",
    topic: "gly",
    choices: ["0,40 à 0,70 g/L", "0,70 à 1,10 g/L", "1,10 à 1,40 g/L"],
    answer: 1,
    explanation: "À jeun : entre 0,70 et 1,10 g/L (3,9 à 6,1 mmol/L).",
  },
  {
    question: "Après un repas, la glycémie reste normalement inférieure à…",
    topic: "gly",
    choices: ["1,10 g/L", "1,40 g/L", "2 g/L"],
    answer: 1,
    explanation: "Après un repas : moins de 1,40 g/L (moins de 7,8 mmol/L).",
  },
  {
    question: "En dessous de quelle glycémie parle-t-on d'hypoglycémie ?",
    topic: "gly",
    choices: ["0,50 g/L", "0,70 g/L", "1 g/L"],
    answer: 1,
    explanation: "Hypoglycémie : moins de 0,70 g/L (moins de 3,9 mmol/L).",
  },
  {
    question: "À jeun, à partir de quelle glycémie parle-t-on d'hyperglycémie ?",
    topic: "gly",
    choices: ["0,90 g/L", "1,10 g/L", "2 g/L"],
    answer: 1,
    explanation: "Hyperglycémie : 1,10 g/L ou plus (6,1 mmol/L ou plus).",
  },
  {
    question: "0,70 g/L de glucose correspond à…",
    topic: "gly",
    choices: ["3,9 mmol/L", "7 mmol/L", "0,7 mmol/L"],
    answer: 0,
    explanation: "0,70 g/L = 3,9 mmol/L, et 1,10 g/L = 6,1 mmol/L.",
  },
  {
    question: "Où piquer pour une glycémie capillaire ?",
    topic: "gly",
    choices: ["Sur le côté du doigt", "Au milieu de la paume", "Dans le pli du coude"],
    answer: 0,
    explanation: "On pique sur le côté du doigt (pulpe).",
  },
  {
    question: "Lesquels de ces signes évoquent une hypoglycémie ?",
    topic: "gly",
    choices: ["Sueurs, tremblements, faim", "Soif intense et urines abondantes", "Fièvre et toux"],
    answer: 0,
    explanation: "Hypoglycémie : sueurs, tremblements, faim, pâleur, malaise…",
  },
  {
    question: "Lesquels de ces signes évoquent une hyperglycémie ?",
    topic: "gly",
    choices: ["Sueurs et tremblements", "Soif, urines fréquentes, fatigue", "Bradycardie"],
    answer: 1,
    explanation: "Hyperglycémie : soif, urines fréquentes, fatigue, vision trouble…",
  },
  {
    question: "Quelle est la saturation en oxygène (SpO2) normale chez l'adulte ?",
    topic: "spo2",
    choices: ["85 à 90 %", "90 à 94 %", "95 à 100 %"],
    answer: 2,
    explanation: "SpO2 normale : supérieure ou égale à 95 %, entre 95 et 100 %.",
  },
  {
    question: "En dessous de quelle SpO2 parle-t-on de désaturation ?",
    topic: "spo2",
    choices: ["98 %", "95 %", "85 %"],
    answer: 1,
    explanation: "Désaturation : SpO2 inférieure à 95 %, à surveiller et signaler selon le contexte.",
  },
  {
    question: "En dessous de quelle SpO2 parle-t-on d'hypoxémie ?",
    topic: "spo2",
    choices: ["95 %", "92 %", "90 %"],
    answer: 2,
    explanation: "Hypoxémie : SpO2 inférieure à 90 %, c'est une urgence.",
  },
  {
    question: "Que mesure la SpO2 ?",
    topic: "spo2",
    choices: ["Le pourcentage d'hémoglobine saturée en oxygène", "La quantité d'air dans les poumons", "Le nombre de respirations par minute"],
    answer: 0,
    explanation: "La SpO2 est le pourcentage d'hémoglobine du sang saturée en oxygène.",
  },
  {
    question: "Où placer le capteur de l'oxymètre de pouls ?",
    topic: "spo2",
    choices: ["Sur un doigt ou le lobe de l'oreille", "Sur le front", "Au pli du coude"],
    answer: 0,
    explanation: "Le capteur se place sur un doigt ou sur le lobe de l'oreille.",
  },
  {
    question: "Combien de temps attendre pour que la mesure de SpO2 se stabilise ?",
    topic: "spo2",
    choices: ["5 à 10 secondes", "1 minute", "5 minutes"],
    answer: 0,
    explanation: "On attend 5 à 10 secondes que la mesure se stabilise.",
  },
  {
    question: "Lequel de ces signes évoque une détresse respiratoire ?",
    topic: "spo2",
    choices: ["Le tirage", "Une FC à 70 bpm", "Une température à 37 °C"],
    answer: 0,
    explanation: "Signes de détresse respiratoire : dyspnée, tirage, cyanose… À interpréter avec la FR.",
  },
  {
    question: "Quelle est la diurèse normale d'un adulte sur 24 h ?",
    topic: "diu",
    choices: ["100 à 400 mL", "600 à 2000 mL", "3 à 5 L"],
    answer: 1,
    explanation: "Chez l'adulte, la diurèse normale est de 600 à 2000 mL par 24 h.",
  },
  {
    question: "En dessous de quel volume d'urines sur 24 h parle-t-on d'oligurie ?",
    topic: "diu",
    choices: ["100 mL", "400 mL", "1000 mL"],
    answer: 1,
    explanation: "Oligurie : moins de 400 mL par 24 h, diminution importante du volume d'urine.",
  },
  {
    question: "En dessous de quel volume d'urines sur 24 h parle-t-on d'anurie ?",
    topic: "diu",
    choices: ["100 mL", "400 mL", "600 mL"],
    answer: 0,
    explanation: "Anurie : moins de 100 mL par 24 h. C'est une urgence.",
  },
  {
    question: "À partir de quel volume d'urines sur 24 h parle-t-on de polyurie ?",
    topic: "diu",
    choices: ["Plus de 1,5 L", "Plus de 2,5 à 3 L", "Plus de 5 L"],
    answer: 1,
    explanation: "Polyurie : plus de 2500 à 3000 mL par 24 h.",
  },
  {
    question: "Comment mesure-t-on la diurèse ?",
    topic: "diu",
    choices: ["En collectant les urines sur 24 h dans un bocal gradué", "En pesant le patient le matin", "Avec une bandelette urinaire"],
    answer: 0,
    explanation: "On collecte les urines sur 24 h dans un bocal (ou sac collecteur) gradué, on mesure le volume et on le note.",
  },
  {
    question: "En plus du volume, que faut-il observer dans les urines ?",
    topic: "diu",
    choices: ["La couleur et l'aspect", "L'odeur uniquement", "Rien d'autre"],
    answer: 0,
    explanation: "La couleur (claires, foncées, hématurie…), l'aspect (limpide, trouble, dépôts…) et le contexte.",
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
  /** Emoji du thème (titres et tuiles). */
  emoji: string;
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
    emoji: "🫀",
    title: "Les constantes",
    description: "FC, FR, température, TA, SpO2, glycémie, diurèse",
    icon: "heart",
    status: "available",
    questions: quiz,
    packSlug: QUIZ_PACK_SLUG,
    packName: "Pack Mémos : Constantes",
  },
  {
    slug: "arret-cardiaque",
    emoji: "🚑",
    title: "L'arrêt cardiaque",
    description: "Reconnaître, alerter, masser, défibriller",
    icon: "heart",
    status: "available",
    questions: arretCardiaque,
  },
  {
    slug: "embolie-pulmonaire",
    emoji: "🫁",
    title: "L'embolie pulmonaire",
    description: "Phlébite, signes, urgence, anticoagulants",
    icon: "lungs",
    status: "available",
    questions: embolie,
  },
  {
    slug: "avc",
    emoji: "🧠",
    title: "L'AVC",
    description: "VITE, ischémique ou hémorragique, le 15",
    icon: "book",
    status: "available",
    questions: avc,
  },
  {
    slug: "bpco",
    emoji: "🌬️",
    title: "La BPCO",
    description: "Bronches, tabac, spirométrie, oxygène",
    icon: "lungs",
    status: "available",
    questions: bpco,
  },
];

export const getQuiz = (slug: string) => quizzes.find((q) => q.slug === slug && q.status === "available");

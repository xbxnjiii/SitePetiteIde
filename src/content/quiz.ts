// ============================================================================
//  QUIZ « Teste-toi sur les constantes » — contenu à faire valider par La Petite IDE.
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
];

/** Message de fin selon le score. */
export function quizVerdict(score: number, total: number) {
  const ratio = score / total;
  if (ratio === 1) return { title: "Sans faute, bravo ! 🏆", text: "Tu maîtrises tes constantes. Garde-les sous la main avec le pack pour réviser en un clin d'œil." };
  if (ratio >= 0.7) return { title: "Très bien ! 💪", text: "Encore quelques valeurs à consolider : le pack te les remet en tête en un coup d'œil." };
  if (ratio >= 0.4) return { title: "Pas mal, mais… 🤔", text: "Les constantes, ça se révise ! Le pack réunit toutes les valeurs à retenir sur des fiches ultra-visuelles." };
  return { title: "Il est temps de réviser 📚", text: "Pas de panique : le pack te donne l'essentiel des constantes, fiche par fiche." };
}

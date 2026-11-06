import { Icon } from "@/components/ui/Icon";
import { quiz } from "@/content/quiz";
import { SourceLink } from "./SourceLink";

/** Carte d'appel vers le quiz gratuit (page de liens et bas de la page de vente). */
export function QuizCta() {
  return (
    <SourceLink href="/quiz-constantes" className="quiz-cta">
      <span className="quiz-cta__icon" aria-hidden="true">
        <Icon name="quiz" />
      </span>
      <span className="quiz-cta__text">
        <span className="quiz-cta__label">Quiz gratuit</span>
        <strong>Es-tu au point sur les constantes ?</strong>
        <span className="quiz-cta__meta">
          <span><Icon name="check" /> {quiz.length} questions</span>
          <span><Icon name="timer" /> 2 min</span>
        </span>
      </span>
      <span className="quiz-cta__go" aria-hidden="true">
        <Icon name="arrow" />
      </span>
    </SourceLink>
  );
}

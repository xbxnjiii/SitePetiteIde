import { Mascot } from "@/components/ui/Mascot";
import { Icon } from "@/components/ui/Icon";
import { SourceLink } from "./SourceLink";

/** Carte d'appel vers le quiz gratuit (page de liens et bas de la page de vente). */
export function QuizCta() {
  return (
    <SourceLink href="/quiz-constantes" className="quiz-cta">
      <Mascot pose="idee" className="quiz-cta__mascot" />
      <span className="quiz-cta__text">
        <strong>Quiz gratuit : teste-toi sur les constantes</strong>
        <span>10 questions, 2 minutes. Tu vas tout réussir ?</span>
      </span>
      <span className="bio-card__arrow" aria-hidden="true">
        <Icon name="arrow" />
      </span>
    </SourceLink>
  );
}

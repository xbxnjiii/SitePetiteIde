import { Icon } from "@/components/ui/Icon";
import { SourceLink } from "./SourceLink";

/** Lien discret vers le quiz gratuit (dans la carte du pack et en bas de la page de vente). */
export function QuizCta({ className = "" }: { className?: string }) {
  return (
    <SourceLink href="/quiz" className={`quiz-link ${className}`}>
      <Icon name="quiz" />
      <span>
        <strong>Quiz gratuits</strong> · teste-toi en 2 min
      </span>
      <Icon name="arrow" />
    </SourceLink>
  );
}

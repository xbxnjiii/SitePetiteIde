import { Icon } from "@/components/ui/Icon";
import { SourceLink } from "./SourceLink";

/** Lien discret vers le quiz gratuit (dans la carte du pack et en bas de la page de vente). */
export function QuizCta({ className = "" }: { className?: string }) {
  return (
    <SourceLink href="/quiz-constantes" className={`quiz-link ${className}`}>
      <Icon name="quiz" />
      <span>
        Pas sûre de toi ? <strong>Teste-toi en 2 min !</strong>
      </span>
      <Icon name="arrow" />
    </SourceLink>
  );
}

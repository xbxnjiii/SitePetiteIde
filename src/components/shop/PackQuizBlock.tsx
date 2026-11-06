import type { Pack } from "@/content/packs";
import { Icon } from "@/components/ui/Icon";
import { PackCover } from "./PackCover";
import { SourceLink } from "./SourceLink";

export type BlockVariant = "a" | "b" | "c";

/** Bloc de la page de liens quand un seul pack est en vente : pack + quiz. */
export function PackQuizBlock({ pack, variant }: { pack: Pack; variant: BlockVariant }) {
  const href = `/${pack.slug}`;
  const img = pack.images ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={pack.images.card} alt="" width={800} height={800} className="pq__img" fetchPriority="high" />
  ) : (
    <PackCover icon={pack.icon} tone={pack.tone} stacked={false} className="pq__img" />
  );

  // A — Boutons empilés façon Beacons
  if (variant === "a") {
    return (
      <div className="pq pq--a">
        <SourceLink href={href} className="pq-a__pack">
          {img}
          <span className="pq-a__text">
            <strong>{pack.name}</strong>
            <span>{pack.tagline}</span>
          </span>
          <Icon name="arrow" />
        </SourceLink>
        <SourceLink href="/quiz-constantes" className="pq-a__quiz">
          <Icon name="quiz" />
          <span>Pas sûre de toi ? <strong>Teste-toi en 2 min !</strong></span>
        </SourceLink>
      </div>
    );
  }

  // B — Deux tuiles côte à côte
  if (variant === "b") {
    return (
      <div className="pq pq--b">
        <SourceLink href={href} className="pq-b__tile pq-b__tile--pack">
          {img}
          <strong>{pack.name}</strong>
          <span className="pq-b__cta">Découvrir <Icon name="arrow" /></span>
        </SourceLink>
        <SourceLink href="/quiz-constantes" className="pq-b__tile pq-b__tile--quiz">
          <span className="pq-b__quizicon"><Icon name="quiz" /></span>
          <strong>Pas sûre de toi ?</strong>
          <span className="pq-b__sub">Quiz gratuit · 10 questions</span>
          <span className="pq-b__cta">Teste-toi en 2 min <Icon name="arrow" /></span>
        </SourceLink>
      </div>
    );
  }

  // C — Grande vitrine visuelle
  return (
    <div className="pq pq--c">
      <SourceLink href={href} className="pq-c__hero">
        {img}
        <span className="pq-c__overlay">
          <strong>{pack.name}</strong>
          <span>{pack.tagline}</span>
        </span>
      </SourceLink>
      <div className="pq-c__actions">
        <SourceLink href={href} className="btn btn--primary pq-c__btn">
          Voir le pack
        </SourceLink>
        <SourceLink href="/quiz-constantes" className="btn btn--secondary pq-c__btn">
          <Icon name="quiz" /> Quiz 2 min
        </SourceLink>
      </div>
    </div>
  );
}

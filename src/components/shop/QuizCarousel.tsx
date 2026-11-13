"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { QuizIcon } from "@/content/quiz";
import { useProgress } from "@/lib/progress";
import { QuizArt } from "./QuizArt";

/** Étoiles du meilleur score (0 à 3) : la moitié, 80 %, sans faute. */
function Stars({ best }: { best?: { score: number; total: number } }) {
  if (!best) return null;
  const r = best.score / best.total;
  const n = r === 1 ? 3 : r >= 0.8 ? 2 : r >= 0.5 ? 1 : 0;
  return (
    <span className="qzc__stars" aria-label={`Meilleur score : ${best.score} sur ${best.total}`}>
      {[0, 1, 2].map((i) => (
        <QuizArt key={i} name="star" className={i < n ? "qzc__star qzc__star--on" : "qzc__star"} />
      ))}
    </span>
  );
}

export interface QuizSlide {
  slug: string;
  icon: QuizIcon;
  /** Dégradé de la carte [début, fin]. */
  tone: [string, string];
  title: string;
  description: string;
  /** Nombre de questions du thème. */
  total: number;
}

export interface QuizModeInfo {
  label: string;
  count: number;
  duration: string;
}


/**
 * Carrousel immersif de la page « Quiz » : une grande carte par thème (≈ 80 % de l'écran),
 * les cartes voisines dépassent pour inviter à glisser. Deux choix par carte : Flash et Pros.
 */
export function QuizCarousel({ slides, flash, pros }: { slides: QuizSlide[]; flash: QuizModeInfo; pros: QuizModeInfo }) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const progress = useProgress();

  // Carte active = celle la plus proche du centre de la zone de défilement.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      Array.from(el.children).forEach((c, i) => {
        const node = c as HTMLElement;
        const d = Math.abs(node.offsetLeft + node.offsetWidth / 2 - center);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      setIndex(best);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const go = (i: number) => {
    const el = track.current;
    const target = el?.children[Math.max(0, Math.min(slides.length - 1, i))] as HTMLElement | undefined;
    if (!el || !target) return;
    el.scrollTo({ left: target.offsetLeft - (el.clientWidth - target.offsetWidth) / 2, behavior: "smooth" });
  };

  return (
    <section
      className="qzc"
      aria-roledescription="carrousel"
      aria-label="Thèmes de quiz"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <ul className="qzc__track" ref={track}>
        {slides.map((s, i) => {
          const [from, to] = s.tone;
          const prosCount = Math.min(pros.count, s.total);
          return (
            <li
              key={s.slug}
              className={i === index ? "qzc__slide qzc__slide--on" : "qzc__slide"}
              aria-roledescription="diapositive"
              aria-label={`${i + 1} sur ${slides.length} : ${s.title}`}
            >
              <article className="qzc__card" style={{ "--from": from, "--to": to } as React.CSSProperties}>
                <div className="qzc__hero">
                  <span className="qzc__emoji">
                    <QuizArt name={s.icon} />
                  </span>
                  <h2 className="qzc__title">{s.title}</h2>
                  <p className="qzc__desc">{s.description}</p>
                </div>
                <div className="qzc__modes">
                  <Link href={`/quiz/${s.slug}?mode=flash`} className="qzc__mode qzc__mode--flash" tabIndex={i === index ? 0 : -1}>
                    <span className="qzc__mode-emoji">
                      <QuizArt name="bolt" />
                    </span>
                    <span className="qzc__mode-text">
                      <strong>{flash.label}</strong>
                      <small>
                        {flash.count} questions · {flash.duration}
                      </small>
                    </span>
                    <Stars best={progress?.best[`${s.slug}:flash`]} />
                    <Icon name="arrow" />
                  </Link>
                  <Link href={`/quiz/${s.slug}?mode=pros`} className="qzc__mode qzc__mode--pros" tabIndex={i === index ? 0 : -1}>
                    <span className="qzc__mode-emoji">
                      <QuizArt name="trophy" />
                    </span>
                    <span className="qzc__mode-text">
                      <strong>{pros.label}</strong>
                      <small>
                        {prosCount} questions · {pros.duration}
                      </small>
                    </span>
                    <Stars best={progress?.best[`${s.slug}:pros`]} />
                    <Icon name="arrow" />
                  </Link>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      <button type="button" className="qzc__nav qzc__nav--prev" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Quiz précédent">
        <Icon name="arrow" />
      </button>
      <button
        type="button"
        className="qzc__nav qzc__nav--next"
        onClick={() => go(index + 1)}
        disabled={index === slides.length - 1}
        aria-label="Quiz suivant"
      >
        <Icon name="arrow" />
      </button>

      <div className="qzc__footer">
        <div className="qzc__dots">
          {slides.map((s, i) => (
            <button
              key={s.slug}
              type="button"
              className={i === index ? "qzc__dot qzc__dot--on" : "qzc__dot"}
              onClick={() => go(i)}
              aria-label={`Voir le quiz ${s.title}`}
              aria-current={i === index ? "true" : undefined}
            />
          ))}
        </div>
        <span className="qzc__counter" aria-live="polite">
          {index + 1} / {slides.length}
        </span>
      </div>
    </section>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export interface QuizSlide {
  slug: string;
  emoji: string;
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

/** Dégradés des cartes, attribués dans l'ordre des thèmes (palette de la marque et teintes voisines). */
const TONES = [
  ["#4E7AC7", "#7FA3E0"],
  ["#B9466F", "#D9779D"],
  ["#6A5ACD", "#9D8FE6"],
  ["#23807C", "#46AFA4"],
  ["#3A63AB", "#5FA8D3"],
  ["#B4473D", "#DB7D60"],
];

/**
 * Carrousel immersif de la page « Quiz » : une grande carte par thème (≈ 80 % de l'écran),
 * les cartes voisines dépassent pour inviter à glisser. Deux choix par carte : Flash et Pros.
 */
export function QuizCarousel({ slides, flash, pros }: { slides: QuizSlide[]; flash: QuizModeInfo; pros: QuizModeInfo }) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

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
          const [from, to] = TONES[i % TONES.length];
          const prosCount = Math.min(pros.count, s.total);
          return (
            <li
              key={s.slug}
              className={i === index ? "qzc__slide qzc__slide--on" : "qzc__slide"}
              aria-roledescription="diapositive"
              aria-label={`${i + 1} sur ${slides.length} : ${s.title}`}
            >
              <article className="qzc__card" style={{ "--from": from, "--to": to } as React.CSSProperties}>
                <span className="qzc__count">{s.total} questions</span>
                <div className="qzc__hero">
                  <span className="qzc__emoji" aria-hidden="true">
                    {s.emoji}
                  </span>
                  <h2 className="qzc__title">{s.title}</h2>
                  <p className="qzc__desc">{s.description}</p>
                </div>
                <div className="qzc__modes">
                  <Link href={`/quiz/${s.slug}?mode=flash`} className="qzc__mode qzc__mode--flash" tabIndex={i === index ? 0 : -1}>
                    <span className="qzc__mode-emoji" aria-hidden="true">⚡</span>
                    <span className="qzc__mode-text">
                      <strong>{flash.label}</strong>
                      <small>
                        {flash.count} questions · {flash.duration}
                      </small>
                    </span>
                    <Icon name="arrow" />
                  </Link>
                  <Link href={`/quiz/${s.slug}?mode=pros`} className="qzc__mode qzc__mode--pros" tabIndex={i === index ? 0 : -1}>
                    <span className="qzc__mode-emoji" aria-hidden="true">🏆</span>
                    <span className="qzc__mode-text">
                      <strong>{pros.label}</strong>
                      <small>
                        {prosCount} questions · {pros.duration}
                      </small>
                    </span>
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

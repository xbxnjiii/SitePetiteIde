"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export interface GallerySlide {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Petite étiquette affichée sur l'image (« Aperçu PDF », « Format papier »…). */
  label?: string;
}

/**
 * Carrousel du visuel de la page de vente : une image à la fois.
 * Glisser au doigt (défilement natif avec aimantation), flèches sur ordinateur, points de navigation.
 */
export function PackGallery({ slides }: { slides: GallerySlide[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  // Image visible = celle la plus proche du bord gauche du défilement.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const target = (i + slides.length) % slides.length;
    el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
  };

  if (slides.length === 1) {
    const s = slides[0];
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={s.src} alt={s.alt} width={s.width} height={s.height} className="sale-main__img" fetchPriority="high" />;
  }

  return (
    <div
      className="gallery"
      role="region"
      aria-roledescription="carrousel"
      aria-label="Visuels du pack"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <div className="gallery__track" ref={track} tabIndex={0}>
        {slides.map((s, i) => (
          <figure
            key={s.src}
            className="gallery__slide"
            role="group"
            aria-roledescription="diapositive"
            aria-label={`${i + 1} sur ${slides.length}${s.label ? ` : ${s.label}` : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.src}
              alt={s.alt}
              width={s.width}
              height={s.height}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : undefined}
              draggable={false}
            />
            {s.label ? <figcaption className="gallery__label">{s.label}</figcaption> : null}
          </figure>
        ))}
      </div>
      <button type="button" className="gallery__nav gallery__nav--prev" onClick={() => go(index - 1)} aria-label="Image précédente">
        <Icon name="arrow" />
      </button>
      <button type="button" className="gallery__nav gallery__nav--next" onClick={() => go(index + 1)} aria-label="Image suivante">
        <Icon name="arrow" />
      </button>
      <div className="gallery__dots">
        {slides.map((s, i) => (
          <button
            key={s.src}
            type="button"
            className={i === index ? "gallery__dot gallery__dot--on" : "gallery__dot"}
            onClick={() => go(i)}
            aria-label={`Voir l'image ${i + 1}${s.label ? ` (${s.label})` : ""}`}
            aria-current={i === index ? "true" : undefined}
          />
        ))}
      </div>
    </div>
  );
}

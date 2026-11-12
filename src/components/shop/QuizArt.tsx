// Icônes des quiz (SVG maison) : remplacent les emojis, qui ne s'affichent pas sur tous les ordinateurs.
// Trait arrondi + aplat léger (currentColor) : lisibles en blanc sur les cartes colorées comme en couleur sur fond clair.

export type QuizArtName =
  | "heart-pulse"
  | "defib"
  | "lungs"
  | "brain"
  | "wind"
  | "tube"
  | "bolt"
  | "trophy"
  | "flame"
  | "check"
  | "cross"
  | "timer"
  | "replay"
  | "duel"
  | "mail"
  | "sparkles"
  | "tools";

const FILL = { fill: "currentColor", fillOpacity: 0.2, stroke: "none" } as const;

const ART: Record<QuizArtName, React.ReactNode> = {
  "heart-pulse": (
    <>
      <path {...FILL} d="M24 41s-15-8.6-15-20.2A8.3 8.3 0 0 1 24 15.9a8.3 8.3 0 0 1 15 4.9C39 32.4 24 41 24 41z" />
      <path d="M24 41s-15-8.6-15-20.2A8.3 8.3 0 0 1 24 15.9a8.3 8.3 0 0 1 15 4.9C39 32.4 24 41 24 41z" />
      <path d="M6 26h9l3-6 5 11 3.5-8 2 3H42" />
    </>
  ),
  defib: (
    <>
      <path {...FILL} d="M24 41s-15-8.6-15-20.2A8.3 8.3 0 0 1 24 15.9a8.3 8.3 0 0 1 15 4.9C39 32.4 24 41 24 41z" />
      <path d="M24 41s-15-8.6-15-20.2A8.3 8.3 0 0 1 24 15.9a8.3 8.3 0 0 1 15 4.9C39 32.4 24 41 24 41z" />
      <path d="M26 19l-6 9h6l-3 8 8-11h-6l3-6" />
    </>
  ),
  lungs: (
    <>
      <path {...FILL} d="M20 17c-4-4-11 4-12 13-.6 5 1.6 8.6 6 8.6 4 0 6-2.6 6-6.6zM28 17c4-4 11 4 12 13 .6 5-1.6 8.6-6 8.6-4 0-6-2.6-6-6.6z" />
      <path d="M20 17c-4-4-11 4-12 13-.6 5 1.6 8.6 6 8.6 4 0 6-2.6 6-6.6V17zM28 17c4-4 11 4 12 13 .6 5-1.6 8.6-6 8.6-4 0-6-2.6-6-6.6V17z" />
      <path d="M24 6v14m0 0-4 4m4-4 4 4" />
    </>
  ),
  brain: (
    <>
      <path {...FILL} d="M24 10a6 6 0 0 0-11 2 6 6 0 0 0-4 9 6 6 0 0 0 2 9 6 6 0 0 0 7 7 5 5 0 0 0 6-1 5 5 0 0 0 6 1 6 6 0 0 0 7-7 6 6 0 0 0 2-9 6 6 0 0 0-4-9 6 6 0 0 0-11-2z" />
      <path d="M24 10a6 6 0 0 0-11 2 6 6 0 0 0-4 9 6 6 0 0 0 2 9 6 6 0 0 0 7 7 5 5 0 0 0 6-1 5 5 0 0 0 6 1 6 6 0 0 0 7-7 6 6 0 0 0 2-9 6 6 0 0 0-4-9 6 6 0 0 0-11-2z" />
      <path d="M24 10v26M18 18c2 0 3 1.5 3 3.5M30 18c-2 0-3 1.5-3 3.5M16 27c2.5 0 4 1.5 4 4M32 27c-2.5 0-4 1.5-4 4" />
    </>
  ),
  wind: (
    <>
      <path d="M6 18h22a5 5 0 1 0-5-5" />
      <path d="M6 26h30a5 5 0 1 1-5 5" />
      <path d="M6 34h14" />
      <circle {...FILL} cx="36" cy="13" r="6" />
      <circle {...FILL} cx="14" cy="34" r="5" />
    </>
  ),
  tube: (
    <>
      <path {...FILL} d="M19 24h10v12a5 5 0 0 1-10 0z" />
      <path d="M19 15h10v21a5 5 0 0 1-10 0z" />
      <rect x="16" y="7" width="16" height="8" rx="2" />
      <path d="M19 24h10M23 29v3" />
      <path d="M37 26c0 1.9-1.3 3.4-3 3.4s-3-1.5-3-3.4c0-2.2 3-5.2 3-5.2s3 3 3 5.2z" />
    </>
  ),
  bolt: (
    <>
      <path {...FILL} d="M27 4 10 27h12l-3 17 18-24H25z" />
      <path d="M27 4 10 27h12l-3 17 18-24H25z" />
    </>
  ),
  trophy: (
    <>
      <path {...FILL} d="M14 7h20v10a10 10 0 0 1-20 0z" />
      <path d="M14 7h20v10a10 10 0 0 1-20 0z" />
      <path d="M14 11H8v3a6 6 0 0 0 6 6M34 11h6v3a6 6 0 0 1-6 6M24 27v7M17 41h14M19 41l1.5-7h7l1.5 7" />
    </>
  ),
  flame: (
    <>
      <path {...FILL} d="M24 44c-7.2 0-12-5-12-11.6 0-5.4 3.2-8.6 5.4-11 .3 3.6 2 6 4.6 6.6C21 20.6 23.4 12 29 5c.6 7 7 12.4 7 23.4C36 38.6 31.2 44 24 44z" />
      <path d="M24 44c-7.2 0-12-5-12-11.6 0-5.4 3.2-8.6 5.4-11 .3 3.6 2 6 4.6 6.6C21 20.6 23.4 12 29 5c.6 7 7 12.4 7 23.4C36 38.6 31.2 44 24 44z" />
      <path d="M24 44c-3.2 0-5.4-2.2-5.4-5.2 0-3.6 3.4-5.6 4.6-9 2.6 2 6.2 5 6.2 9 0 3-2.2 5.2-5.4 5.2z" />
    </>
  ),
  check: (
    <>
      <circle {...FILL} cx="24" cy="24" r="18" />
      <circle cx="24" cy="24" r="18" />
      <path d="m16 24.5 5.5 5.5L32.5 19" />
    </>
  ),
  cross: (
    <>
      <circle {...FILL} cx="24" cy="24" r="18" />
      <circle cx="24" cy="24" r="18" />
      <path d="m18 18 12 12M30 18 18 30" />
    </>
  ),
  timer: (
    <>
      <circle {...FILL} cx="24" cy="27" r="15" />
      <circle cx="24" cy="27" r="15" />
      <path d="M24 27v-7M20 5h8M24 5v7M36 13l3-3" />
    </>
  ),
  replay: (
    <>
      <path d="M38 24A14 14 0 1 1 33.9 14.1" />
      <path d="M38 8v8h-8" />
      <path {...FILL} d="m21 18 9 6-9 6z" />
      <path d="m21 18 9 6-9 6z" />
    </>
  ),
  duel: (
    <>
      <path d="M8 8l18 18M8 8h7M8 8v7M40 8 22 26M40 8h-7M40 8v7" />
      <path d="M16 30l-6 6M32 30l6 6M13 27l8 8M35 27l-8 8" />
      <circle {...FILL} cx="9" cy="39" r="3.5" />
      <circle {...FILL} cx="39" cy="39" r="3.5" />
    </>
  ),
  mail: (
    <>
      <rect {...FILL} x="6" y="11" width="36" height="26" rx="5" />
      <rect x="6" y="11" width="36" height="26" rx="5" />
      <path d="m8 14 16 12 16-12" />
    </>
  ),
  sparkles: (
    <>
      <path {...FILL} d="M20 6c1.5 8.5 4.5 11.5 13 13-8.5 1.5-11.5 4.5-13 13-1.5-8.5-4.5-11.5-13-13 8.5-1.5 11.5-4.5 13-13z" />
      <path d="M20 6c1.5 8.5 4.5 11.5 13 13-8.5 1.5-11.5 4.5-13 13-1.5-8.5-4.5-11.5-13-13 8.5-1.5 11.5-4.5 13-13zM36 30c.7 3.6 2.4 5.3 6 6-3.6.7-5.3 2.4-6 6-.7-3.6-2.4-5.3-6-6 3.6-.7 5.3-2.4 6-6z" />
    </>
  ),
  tools: (
    <>
      <path d="M29 9a8 8 0 0 0-8.6 10.6L8 32a3.5 3.5 0 0 0 5 5l12.4-12.4A8 8 0 0 0 36 16l-5 5-4.5-1.5L25 15l5-5a8 8 0 0 0-1-1z" />
      <path {...FILL} d="M29 9a8 8 0 0 0-8.6 10.6L8 32a3.5 3.5 0 0 0 5 5l12.4-12.4A8 8 0 0 0 36 16l-5 5-4.5-1.5L25 15l5-5a8 8 0 0 0-1-1z" />
    </>
  ),
};

export function QuizArt({ name, className, title }: { name: QuizArtName; className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className ? `qart ${className}` : "qart"}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {ART[name]}
    </svg>
  );
}

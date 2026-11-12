// Jeu d'icônes en SVG (trait 2 px), dessiné pour le site : aucune dépendance.
import type { IconName } from "@/content/packs";

export type UiIcon =
  | IconName
  | "clipboard"
  | "toolbox"
  | "pill"
  | "cart"
  | "menu"
  | "close"
  | "search"
  | "check"
  | "download"
  | "phone"
  | "spark"
  | "shield"
  | "clock"
  | "tiktok"
  | "instagram"
  | "arrow"
  | "trash"
  | "mail"
  | "gift"
  | "quiz"
  | "timer"
  | "lock";

const paths: Record<UiIcon, React.ReactNode> = {
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" transform="translate(0 -2)" /><path d="M9 8h7M9 11h5" /></>,
  clipboard: <><rect x="5" y="4" width="14" height="18" rx="2" /><path d="M9 4V3h6v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z" /><path d="M9 11h6M9 15h4" /></>,
  syringe: <><path d="m18 2 4 4" /><path d="m17 7 3-3" /><path d="M19 9 8.7 19.3a1 1 0 0 1-1.4 0l-2.6-2.6a1 1 0 0 1 0-1.4L15 5" /><path d="m9 11 4 4" /><path d="m5 19-3 3" /><path d="m14 4 6 6" /></>,
  note: <><path d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M15 3v5h5" /><path d="M8 13h8M8 17h5" /></>,
  toolbox: <><rect x="2" y="8" width="20" height="13" rx="2" /><path d="M8 8V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3" /><path d="M2 13h20M10 13v2h4v-2" /></>,
  layers: <><path d="m12 2 10 5-10 5L2 7z" /><path d="m2 12 10 5 10-5" /><path d="m2 17 10 5 10-5" /></>,
  heart: <><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" /><path d="M3.5 12H8l1.5-3 3 6 1.5-3h6.5" /></>,
  lungs: <><path d="M12 3v9" /><path d="M12 12c-1 1-3 1.5-3 1.5" /><path d="M12 12c1 1 3 1.5 3 1.5" /><path d="M8.5 6C5 6 3 10.5 3 15.5c0 2.5 1 4.5 3.5 4.5S10 18 10 15V9.5C10 7.5 9.5 6 8.5 6z" /><path d="M15.5 6C19 6 21 10.5 21 15.5c0 2.5-1 4.5-3.5 4.5S14 18 14 15V9.5C14 7.5 14.5 6 15.5 6z" /></>,
  thermo: <><path d="M14 14.8V4a2 2 0 1 0-4 0v10.8a4 4 0 1 0 4 0z" /><path d="M12 9v8" /></>,
  drop: <><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5S12.5 5 12 2.5C11.5 5 10 7.9 8 9.5S5 13 5 15a7 7 0 0 0 7 7z" /></>,
  pill: <><path d="m10.5 20.5 10-10a5 5 0 0 0-7-7l-10 10a5 5 0 0 0 7 7z" /><path d="m8.5 8.5 7 7" /></>,
  gauge: <><path d="M12 14 16 10" /><path d="M3.3 19a10 10 0 1 1 17.4 0" /><circle cx="12" cy="14" r="1.5" /></>,
  cart: <><path d="M5 7h14l-1.2 10.2A2 2 0 0 1 15.8 19H8.2a2 2 0 0 1-2-1.8z" /><path d="M9 10V6a3 3 0 0 1 6 0v4" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  close: <><path d="M6 6l12 12M18 6 6 18" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  check: <><path d="M20 6 9 17l-5-5" /></>,
  download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
  phone: <><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M11 18h2" /></>,
  spark: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  tiktok: <><path d="M15 3c.4 2.6 2 4.2 4.5 4.5V11c-1.7 0-3.2-.5-4.5-1.4V15a6 6 0 1 1-6-6v3.4A2.6 2.6 0 1 0 11.6 15V3z" /></>,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  quiz: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5" /><circle cx="12" cy="17" r="0.6" fill="currentColor" /></>,
  timer: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2" /><path d="M10 2h4" /></>,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
};

export function Icon({ name, title, className }: { name: UiIcon; title?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {paths[name]}
    </svg>
  );
}

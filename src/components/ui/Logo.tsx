import Link from "next/link";

// Logo provisoire (pictogramme + texte en Fredoka) — à remplacer par le logo officiel.
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="La Petite IDE — accueil">
      <svg viewBox="0 0 40 40" className="logo__mark" aria-hidden="true">
        <rect width="40" height="40" rx="12" fill="#4E7AC7" />
        <path d="M20 10v20M10 20h20" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="31" cy="9" r="5" fill="#EAA7C1" />
      </svg>
      <span className="logo__text">
        La Petite <span>IDE</span>
      </span>
    </Link>
  );
}

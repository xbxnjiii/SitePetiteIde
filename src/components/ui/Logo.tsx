import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="La Petite IDE — accueil">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/logo-rond-256.webp" alt="" width={44} height={44} className="logo__mark" />
      <span className="logo__text">
        La Petite <span>IDE</span>
      </span>
    </Link>
  );
}

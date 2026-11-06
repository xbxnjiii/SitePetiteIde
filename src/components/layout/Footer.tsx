import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SITE } from "@/lib/format";

export function Footer({ social = true }: { social?: boolean }) {
  return (
    <footer className="mini-footer">
      {social ? (
      <div className="social social--light">
        <a href={SITE.social.tiktok} target="_blank" rel="noopener noreferrer" aria-label="La Petite IDE sur TikTok"><Icon name="tiktok" /></a>
        <a href={SITE.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="La Petite IDE sur Instagram"><Icon name="instagram" /></a>
        <a href={`mailto:${SITE.contactEmail}`} aria-label="Nous écrire par email"><Icon name="mail" /></a>
      </div>
      ) : null}
      <nav aria-label="Informations légales" className="mini-footer__links">
        <Link href="/faq">FAQ</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/mentions-legales">Mentions légales</Link>
        <Link href="/cgv">CGV</Link>
        <Link href="/confidentialite">Confidentialité</Link>
      </nav>
      <p>© {new Date().getFullYear()} La Petite IDE · Supports pédagogiques : ils ne remplacent ni les protocoles de ton service ni l&apos;encadrement en stage.</p>
    </footer>
  );
}

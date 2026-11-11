import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { MoreMenu } from "./MoreMenu";
import { SITE, TEST_FEATURES } from "@/lib/format";

/**
 * Pied de page minimal : réseaux (facultatif), copyright, et un bouton « ··· » qui déplie les liens
 * (retrouver son achat, FAQ, contact, pages légales). Le menu est un <details> : il fonctionne même sans JavaScript.
 */
export function Footer({ social = true, compact = false }: { social?: boolean; compact?: boolean }) {
  // Pied de page « ••• » : en test, préprod uniquement.
  if (!TEST_FEATURES) return <ClassicFooter social={social} compact={compact} />;
  return (
    <footer className={compact ? "mini-footer mini-footer--menu mini-footer--compact" : "mini-footer mini-footer--menu"}>
      <div className="mini-footer__row">
        {social ? (
          <div className="social social--light">
            <a href={SITE.social.tiktok} target="_blank" rel="noopener noreferrer" aria-label="La Petite IDE sur TikTok"><Icon name="tiktok" /></a>
            <a href={SITE.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="La Petite IDE sur Instagram"><Icon name="instagram" /></a>
            <a href={`mailto:${SITE.contactEmail}`} aria-label="Nous écrire par email"><Icon name="mail" /></a>
          </div>
        ) : (
          <span className="mini-footer__copy">© {new Date().getFullYear()} La Petite IDE</span>
        )}
        <MoreMenu>
          <nav aria-label="Aide et informations légales" className="more__menu">
            <Link href="/retrouver-mon-achat">Retrouver mon achat</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/cgv">CGV</Link>
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/confidentialite">Confidentialité</Link>
            <p>Supports de révision : ils ne remplacent ni tes cours ni les protocoles de soins.</p>
          </nav>
        </MoreMenu>
      </div>
      {social ? <p className="mini-footer__copy">© {new Date().getFullYear()} La Petite IDE</p> : null}
    </footer>
  );
}

/** Pied de page en production : réseaux, liens d'aide et pages légales visibles. */
function ClassicFooter({ social, compact }: { social: boolean; compact: boolean }) {
  return (
    <footer className={compact ? "mini-footer mini-footer--compact" : "mini-footer"}>
      {social ? (
        <div className="social social--light">
          <a href={SITE.social.tiktok} target="_blank" rel="noopener noreferrer" aria-label="La Petite IDE sur TikTok"><Icon name="tiktok" /></a>
          <a href={SITE.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="La Petite IDE sur Instagram"><Icon name="instagram" /></a>
          <a href={`mailto:${SITE.contactEmail}`} aria-label="Nous écrire par email"><Icon name="mail" /></a>
        </div>
      ) : null}
      <nav aria-label="Informations légales" className="mini-footer__links">
        <Link href="/retrouver-mon-achat">Retrouver mon achat</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/mentions-legales">Mentions légales</Link>
        <Link href="/cgv">CGV</Link>
        <Link href="/confidentialite">Confidentialité</Link>
      </nav>
      <p>
        © {new Date().getFullYear()} La Petite IDE{compact ? null : <> · Supports de révision : ils ne remplacent ni tes cours ni les protocoles de soins.</>}
      </p>
    </footer>
  );
}

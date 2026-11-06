import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { getCategories } from "@/lib/catalog";
import { SITE } from "@/lib/format";

export async function Footer() {
  const categories = await getCategories();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <Logo />
            <p>Des fiches, mémos et outils pratiques pensés par et pour les étudiants en soins infirmiers.</p>
            <div className="social">
              <a href={SITE.social.tiktok} target="_blank" rel="noopener noreferrer" aria-label="La Petite IDE sur TikTok">
                <Icon name="tiktok" />
              </a>
              <a href={SITE.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="La Petite IDE sur Instagram">
                <Icon name="instagram" />
              </a>
            </div>
          </div>
          <div>
            <h3>Boutique</h3>
            <ul>
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/categorie/${c.slug}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Aide</h3>
            <ul>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/a-propos">À propos</Link></li>
            </ul>
          </div>
          <div>
            <h3>Informations</h3>
            <ul>
              <li><Link href="/mentions-legales">Mentions légales</Link></li>
              <li><Link href="/cgv">CGV</Link></li>
              <li><Link href="/confidentialite">Politique de confidentialité</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} La Petite IDE</span>
          <span>Supports pédagogiques — ils ne remplacent pas les protocoles de ton service ni l&apos;encadrement en stage.</span>
        </div>
      </div>
    </footer>
  );
}

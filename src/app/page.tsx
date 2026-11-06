import Link from "next/link";
import { publishedPacks } from "@/content/packs";
import { Footer } from "@/components/layout/Footer";
import { PackCover } from "@/components/shop/PackCover";
import { Icon } from "@/components/ui/Icon";
import { Mascot } from "@/components/ui/Mascot";
import { Price } from "@/components/ui/Price";
import { SITE } from "@/lib/format";

// Page d'accueil « lien en bio » (façon Beacons) : une colonne, une action par carte.
export default function BioPage() {
  const packs = publishedPacks();
  return (
    <div className="bio">
      <main id="contenu" className="bio__inner">
        <header className="bio__head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-rond-512.webp" alt="Logo La Petite IDE" width={256} height={256} className="bio__avatar" fetchPriority="high" />
          <h1 className="bio__name">
            La Petite <span>IDE</span>
          </h1>
          <p className="bio__slogan">Les soins, simplement.</p>
          <p className="bio__tagline">Fiches mémo et packs de révision pour les étudiants infirmiers 💙</p>
          <div className="social">
            <a href={SITE.social.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"><Icon name="tiktok" /></a>
            <a href={SITE.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Icon name="instagram" /></a>
            <a href={`mailto:${SITE.contactEmail}`} aria-label="Email"><Icon name="mail" /></a>
          </div>
        </header>

        <section aria-labelledby="packs-title" className="bio__section">
          <h2 id="packs-title" className="bio__label">Nos packs de fiches</h2>
          <ul className="bio__list">
            {packs.map((p) => (
              <li key={p.slug}>
                <Link href={`/${p.slug}`} className="bio-card">
                  <PackCover icon={p.icon} tone={p.tone} stacked={false} className="bio-card__cover" />
                  <span className="bio-card__body">
                    {p.badge ? <span className="badge badge--pink">{p.badge}</span> : null}
                    <span className="bio-card__name">{p.name}</span>
                    <span className="bio-card__desc">{p.tagline}</span>
                    <Price cents={p.priceCents} compareAt={p.compareAtPriceCents} />
                  </span>
                  <span className="bio-card__arrow" aria-hidden="true"><Icon name="arrow" /></span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="bio__soon">
            <Mascot pose="lecture" className="bio__soon-img" />
            <p>D&apos;autres packs sont en préparation… Suis-nous pour ne rien rater !</p>
          </div>
        </section>

        <section className="bio__section">
          <ul className="bio__perks">
            <li><Icon name="download" /> PDF reçu par email, immédiatement</li>
            <li><Icon name="shield" /> Paiement sécurisé · Apple Pay, Google Pay, carte</li>
            <li><Icon name="phone" /> Sur ton téléphone ou à imprimer</li>
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}

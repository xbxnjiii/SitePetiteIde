import { publishedPacks } from "@/content/packs";
import { Footer } from "@/components/layout/Footer";
import { OfferBanner } from "@/components/shop/OfferBanner";
import { PackCover } from "@/components/shop/PackCover";
import { type BlockVariant, PackQuizBlock } from "@/components/shop/PackQuizBlock";
import { QuizCta } from "@/components/shop/QuizCta";
import { SourceLink } from "@/components/shop/SourceLink";
import { Icon } from "@/components/ui/Icon";
import { Mascot } from "@/components/ui/Mascot";
import { SITE } from "@/lib/format";

export const metadata = { alternates: { canonical: "/" } };

const BLOCK_VARIANT: BlockVariant = "a";

// Page d'accueil « lien en bio » (façon Beacons) : une colonne, une action par carte.
export default function BioPage() {
  const packs = publishedPacks();
  return (
    <div className="bio">
      <OfferBanner />
      <main id="contenu" className="bio__inner">
        <header className="bio__head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-rond-512.webp" alt="Logo La Petite IDE" width={256} height={256} className="bio__avatar" fetchPriority="high" />
          <h1 className="bio__name">
            La Petite <span>IDE</span>
          </h1>
          <p className="bio__slogan">Les soins, simplement.</p>
          <p className="bio__tagline">Fiches mémo pour étudiants infirmiers 💙</p>
          <div className="social social--brand">
            <a href={SITE.social.tiktok} target="_blank" rel="noopener noreferrer" aria-label="La Petite IDE sur TikTok" className="social__tiktok"><Icon name="tiktok" /></a>
            <a href={SITE.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="La Petite IDE sur Instagram" className="social__instagram"><Icon name="instagram" /></a>
            <a href={`mailto:${SITE.contactEmail}`} aria-label="Nous écrire par email" className="social__mail"><Icon name="mail" /></a>
          </div>
        </header>

        <section aria-labelledby="packs-title" className="bio__section">
          <h2 id="packs-title" className="visually-hidden">Nos packs de fiches</h2>
          {packs.length === 1 ? (
            // Un seul pack : pack + quiz réunis (tout tient sur un écran).
            <PackQuizBlock pack={packs[0]} variant={BLOCK_VARIANT} />
          ) : (
            <>
              <ul className="bio__list">
                {packs.map((p) => (
                  <li key={p.slug}>
                    <SourceLink href={`/${p.slug}`} className="bio-card">
                      {p.images ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images.card} alt="" width={800} height={800} className="bio-card__thumb" />
                      ) : (
                        <PackCover icon={p.icon} tone={p.tone} stacked={false} className="bio-card__cover" />
                      )}
                      <span className="bio-card__row">
                        <span className="bio-card__body">
                          <span className="bio-card__name">{p.name}</span>
                          <span className="bio-card__desc">{p.tagline}</span>
                        </span>
                        <span className="bio-card__arrow" aria-hidden="true"><Icon name="arrow" /></span>
                      </span>
                    </SourceLink>
                  </li>
                ))}
              </ul>
              <QuizCta className="bio__quiz" />
            </>
          )}
          <div className="bio__soon">
            <Mascot pose="lecture" className="bio__soon-img" />
            <p>D&apos;autres packs arrivent bientôt… Suis-nous pour ne rien rater !</p>
          </div>
        </section>
      </main>
      <Footer social={false} compact />
    </div>
  );
}

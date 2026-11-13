import { publishedPacks } from "@/content/packs";
import { Footer } from "@/components/layout/Footer";
import { OfferBanner } from "@/components/shop/OfferBanner";
import { PackCover } from "@/components/shop/PackCover";
import { type BlockVariant, PackQuizBlock } from "@/components/shop/PackQuizBlock";
import { QuizCta } from "@/components/shop/QuizCta";
import { SourceLink } from "@/components/shop/SourceLink";
import { TipBlock } from "@/components/shop/TipBlock";
import { Icon } from "@/components/ui/Icon";
import { Mascot } from "@/components/ui/Mascot";
import { getEnvAsync } from "@/lib/env";
import { SITE } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { DailyQuestionButton } from "@/components/shop/DailyQuestion";
import { MyFichesLink } from "@/components/shop/MyFiches";

export const metadata = { alternates: { canonical: "/" } };

const BLOCK_VARIANT: BlockVariant = "a";

// Rendu à chaque visite : les éléments s'affichent / se masquent depuis /admin (Réglages › Page de liens).
export const dynamic = "force-dynamic";

// Page d'accueil « lien en bio » (façon Beacons) : une colonne, une action par carte.
export default async function BioPage() {
  const { bio: show, links: allLinks } = await getSettings(await getEnvAsync());
  const links = allLinks.filter((l) => l.on);
  const packs = show.packs ? publishedPacks() : [];
  const hasSocial = show.tiktok || show.instagram || show.mail;
  return (
    <div className="bio">
      {show.offer ? <OfferBanner /> : null}
      <main id="contenu" className="bio__inner">
        <header className="bio__head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-rond-512.webp" alt="Logo La Petite IDE" width={256} height={256} className="bio__avatar" fetchPriority="high" />
          <h1 className="bio__name">
            La Petite <span>IDE</span>
          </h1>
          {show.slogan ? <p className="bio__slogan">Les soins, simplement.</p> : null}
          {show.tagline ? <p className="bio__tagline">Fiches mémo pour étudiants infirmiers 💙</p> : null}
          {hasSocial ? (
            <div className="social social--brand">
              {show.tiktok ? <a href={SITE.social.tiktok} target="_blank" rel="noopener noreferrer" aria-label="La Petite IDE sur TikTok" className="social__tiktok"><Icon name="tiktok" /></a> : null}
              {show.instagram ? <a href={SITE.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="La Petite IDE sur Instagram" className="social__instagram"><Icon name="instagram" /></a> : null}
              {show.mail ? <a href={`mailto:${SITE.contactEmail}`} aria-label="Nous écrire par email" className="social__mail"><Icon name="mail" /></a> : null}
            </div>
          ) : null}
        </header>

        <section aria-labelledby="packs-title" className="bio__section">
          <h2 id="packs-title" className="visually-hidden">Nos packs de fiches</h2>
          <MyFichesLink />
          {packs.length === 1 || (!packs.length && show.quiz) ? (
            // Un seul pack : pack + quiz réunis (tout tient sur un écran).
            <PackQuizBlock pack={packs[0] ?? publishedPacks()[0]} variant={BLOCK_VARIANT} showPack={packs.length > 0} showQuiz={show.quiz} />
          ) : packs.length > 1 ? (
            <>
              {show.quiz ? <QuizCta className="bio__quiz" /> : null}
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
            </>
          ) : null}
          {show.daily ? <DailyQuestionButton /> : null}
          {links.length ? (
            <ul className="bio-links">
              {links.map((l) => {
                const external = !l.url.startsWith("/");
                return (
                  <li key={l.id}>
                    <a href={l.url} className="bio-link" {...(external && !l.url.startsWith("mailto:") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                      {l.emoji ? <span className="bio-link__emoji" aria-hidden="true">{l.emoji}</span> : null}
                      <span className="bio-link__label">{l.label}</span>
                      <Icon name="arrow" />
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {show.soon ? (
            <div className="bio__soon">
              <Mascot pose="lecture" className="bio__soon-img" />
              <p>D&apos;autres packs arrivent bientôt… Suis-nous pour ne rien rater !</p>
            </div>
          ) : null}
        </section>
        {show.tip ? <TipBlock /> : null}
      </main>
      <Footer social={false} compact />
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPack, publishedPacks, type Pack } from "@/content/packs";
import { SHIPPING } from "@/content/shipping";
import { CheckoutError } from "@/components/shop/CheckoutError";
import { OfferBanner } from "@/components/shop/OfferBanner";
import { PackCheckout } from "@/components/shop/PackCheckout";
import { PackCover } from "@/components/shop/PackCover";
import { PackGallery } from "@/components/shop/PackGallery";
import { QuizCta } from "@/components/shop/QuizCta";
import { SheetPreviews } from "@/components/shop/SheetPreviews";
import { StickyBuyBar } from "@/components/shop/StickyBuyBar";
import { Icon } from "@/components/ui/Icon";
import { getEnvAsync } from "@/lib/env";
import { SITE, TEST_FEATURES, formatPrice } from "@/lib/format";
import { applySettings, getSettings } from "@/lib/settings";
import { jsonLd } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;
// Rendu à chaque visite : la version papier s'active / se désactive depuis /admin (Réglages).
export const dynamic = "force-dynamic";

async function livePack(slug: string) {
  const pack = getPack(slug);
  return pack && applySettings(pack, await getSettings(await getEnvAsync()));
}

export function generateStaticParams() {
  return publishedPacks().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const pack = await livePack((await params).slug);
  if (!pack) return {};
  return {
    title: pack.name,
    description: `${pack.promise} ${formatPrice(pack.priceCents)}, fiches numériques (PDF ou images) reçues par email${pack.print ? ", ou en fiches papier livrées" : ""}.`,
    alternates: { canonical: `/${pack.slug}` },
    openGraph: {
      title: pack.name,
      description: pack.tagline,
      ...(pack.images?.og ? { images: [{ url: pack.images.og, width: 1200, height: 630 }] } : {}),
    },
  };
}

const faqFor = (pack: Pack) => [
  pack.print
    ? {
        q: "Comment je reçois mon pack ?",
        a: `En numérique (PDF et images) : juste après le paiement, bouton de téléchargement immédiat et lien par email (valable 30 jours). En papier : ${SHIPPING.dispatch.toLowerCase()} par ${SHIPPING.name} (${formatPrice(SHIPPING.priceCents)}), avec les fiches numériques offertes tout de suite.`,
      }
    : { q: "Comment je reçois mon pack ?", a: "Juste après le paiement : bouton de téléchargement immédiat et lien envoyé par email (valable 30 jours)." },
  pack.print
    ? {
        q: "C'est un format papier ?",
        a: `Les deux au choix ! En numérique (PDF et images), ou en fiches papier (${pack.print.specs.join(", ").toLowerCase()}) livrées en ${SHIPPING.zone}, avec la version numérique offerte.`,
      }
    : { q: "C'est un format papier ?", a: "Non, numérique : tu reçois le PDF (idéal pour imprimer) et les fiches en images (idéal sur téléphone)." },
  pack.print
    ? {
        q: "Et si les fiches sont améliorées ?",
        a: "Les mises à jour de la version numérique sont gratuites : tu reçois la nouvelle version, même si tu as pris le format papier.",
      }
    : { q: "Et si les fiches sont améliorées ?", a: "Les mises à jour sont gratuites : tu reçois la nouvelle version des fiches que tu as achetées." },
  { q: "Je n'ai pas reçu l'email", a: `Regarde dans tes spams. Sinon, va sur la page « Retrouver mon achat » (${TEST_FEATURES ? "menu ··· en bas de page" : "en bas de page"}) : tes liens te sont renvoyés.` },
];

export default async function PackPage({ params }: { params: Params }) {
  const pack = await livePack((await params).slug);
  if (!pack) notFound();

  const structured = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pack.name,
    description: pack.description,
    ...(pack.images ? { image: `${SITE.url}${pack.images.card}` } : {}),
    brand: { "@type": "Brand", name: SITE.name },
    offers: {
      "@type": "Offer",
      url: `${SITE.url}/${pack.slug}`,
      priceCurrency: "EUR",
      price: (pack.priceCents / 100).toFixed(2),
      availability: "https://schema.org/InStock",
    },
  };

  // Aperçus des fiches = format de page en test (préprod uniquement, voir src/content/packs.ts).
  const testLayout = Boolean(pack.previews?.length);
  const paperSpec = pack.print ? (
    <div className={pack.print.photo ? "paper-spec paper-spec--photo" : "paper-spec"}>
      {pack.print.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pack.print.photo.src}
          alt={pack.print.photo.alt}
          width={pack.print.photo.width}
          height={pack.print.photo.height}
          className="paper-spec__photo"
          loading="lazy"
        />
      ) : (
        <span className="paper-spec__icon" aria-hidden="true">
          <Icon name="note" />
        </span>
      )}
      <div className="paper-spec__body">
        <p className="paper-spec__title">Version papier</p>
        <ul className="paper-spec__chips">
          {pack.print.specs.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="paper-spec__note">
          Numérique offert · Livraison {formatPrice(SHIPPING.priceCents)} · {SHIPPING.dispatch.toLowerCase()}
        </p>
      </div>
    </div>
  ) : null;

  return (
    <div className="has-sticky-buy sale">
      <OfferBanner />
      <section className="container sale-main">
        <div className="sale-main__visual">
          {pack.images ? (
            // Carrousel : visuel du pack, aperçus (PDF), puis photo du format papier s'il y en a une.
            <PackGallery
              slides={[
                { src: pack.images.card, alt: pack.images.alt, width: 800, height: 800 },
                ...(pack.images.gallery ?? []),
                ...(pack.print?.photo ? [{ ...pack.print.photo, label: "Format papier" }] : []),
              ]}
            />
          ) : (
            <PackCover icon={pack.icon} tone={pack.tone} />
          )}
        </div>

        <div className="sale-main__info">
          <h1>{pack.headline}</h1>
          <p className="sale-main__promise">{pack.promise}</p>

          {pack.previews?.length ? (
            <div className="sale-sheets">
              <SheetPreviews
                sheets={pack.previews.map((p, n) => ({
                  ...p,
                  title: pack.items[n]?.title ?? "Fiche bonus",
                  bonus: n >= pack.items.length,
                }))}
                packLabel={`Tout le pack · ${formatPrice(pack.priceCents)}`}
                unitLabel={pack.unit ? `Cette fiche seule · ${formatPrice(pack.unit.priceCents)}` : null}
              />
              <p className="sale-sheets__note">
                {pack.items.length + (pack.bonus ? 1 : 0)} fiches{pack.bonus ? " dont 1 bonus 🎁" : ""} · PDF et images · sur téléphone ou à imprimer
              </p>
            </div>
          ) : (
            <>
              <ul className="sale-main__points">
                {pack.highlights.map((h) => (
                  <li key={h}>
                    <Icon name="check" /> {h}
                  </li>
                ))}
              </ul>
              <p className="sale-main__update">
                <Icon name="spark" /> Si on mets à jour une fiche, on te l&apos;envoi !
              </p>

              {pack.bonus ? (
                <div className="bonus-card">
                  <span className="bonus-card__icon" aria-hidden="true">
                    <Icon name="gift" />
                  </span>
                  <p>
                    <strong>{pack.bonus.title}</strong> {pack.bonus.text}
                  </p>
                </div>
              ) : null}
            </>
          )}

          <div className="sale-buy" id="acheter" data-buy-anchor="">
            <Suspense>
              <CheckoutError />
            </Suspense>
            <PackCheckout
              slug={pack.slug}
              priceCents={pack.priceCents}
              print={pack.print ?? null}
              unit={
                pack.unit
                  ? {
                      priceCents: pack.unit.priceCents,
                      items: pack.items.slice(0, pack.unit.files.length).map((i) => ({ title: i.title, icon: i.icon })),
                      packCount: pack.items.length + (pack.bonus ? 1 : 0),
                    }
                  : null
              }
            />
          </div>
        </div>
      </section>

      {testLayout ? (
        // Format en test (préprod) : les aperçus remplacent la liste « Dans le pack ».
        pack.print ? (
          <section className="container sale-content" aria-label="Version papier">
            {paperSpec}
          </section>
        ) : null
      ) : (
        <section className="container sale-content" aria-labelledby="contenu-title">
          <h2 id="contenu-title">Dans le pack</h2>
          <ul className="sale-tiles">
            {pack.items.map((item) => (
              <li key={item.title} className="sale-tile">
                <span className="sale-tile__icon" aria-hidden="true">
                  <Icon name={item.icon} />
                </span>
                <span className="sale-tile__text">
                  <strong>{item.title}</strong>
                </span>
              </li>
            ))}
            {pack.bonus ? (
              <li className="sale-tile sale-tile--bonus">
                <span className="sale-tile__icon" aria-hidden="true">
                  <Icon name="gift" />
                </span>
                <span className="sale-tile__text">
                  <strong>Fiche bonus</strong>
                </span>
              </li>
            ) : null}
          </ul>
          <p className="sale-content__total">
            {pack.items.length + (pack.bonus ? 1 : 0)} fiches ·{" "}
            {pack.print ? "en numérique (PDF ou image) ou en papier" : "en PDF et en images, sur téléphone ou à imprimer"}
          </p>
          {paperSpec}
        </section>
      )}

      <section className="container sale-faq" aria-labelledby="faq-title">
        <h2 id="faq-title">Questions fréquentes</h2>
        <div className="faq">
          {faqFor(pack).map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="container sale-quiz" aria-label="Quiz gratuit">
        <QuizCta />
      </section>

      <StickyBuyBar>
        <a href="#acheter" className="btn btn--primary btn--buy sticky-buy__btn">
          Obtenir
        </a>
      </StickyBuyBar>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </div>
  );
}

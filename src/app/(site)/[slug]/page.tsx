import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPack, publishedPacks, type Pack } from "@/content/packs";
import { SHIPPING, SHIPPING_FROM_CENTS } from "@/content/shipping";
import { CheckoutError } from "@/components/shop/CheckoutError";
import { OfferBanner } from "@/components/shop/OfferBanner";
import { BuyButton } from "@/components/shop/BuyButton";
import { PackOffers } from "@/components/shop/PackOffers";
import { PackCover } from "@/components/shop/PackCover";
import { PackGallery } from "@/components/shop/PackGallery";
import { QuizCta } from "@/components/shop/QuizCta";
import { SheetPreviews } from "@/components/shop/SheetPreviews";
import { StickyBuyBar } from "@/components/shop/StickyBuyBar";
import { Icon } from "@/components/ui/Icon";
import { getEnvAsync } from "@/lib/env";
import { availableMethods, relayConfig } from "@/lib/relay";
import { SITE, formatPrice } from "@/lib/format";
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
  ...(pack.revision
    ? [
        {
          q: "C'est quoi, les fiches de révision ?",
          a: `Une fiche A4 par constante, en carton plastifié : le recto a des trous à compléter (au feutre effaçable), le verso donne la correction. Tu peux t'entraîner autant de fois que tu veux. Livrées en ${SHIPPING.zone}, avec la version numérique offerte.`,
        },
      ]
    : []),
  pack.print
    ? {
        q: "Comment je reçois mon pack ?",
        a: `En numérique (PDF et images) : juste après le paiement, bouton de téléchargement immédiat et lien par email (valable 30 jours). En fiches de poche : ${SHIPPING.dispatch.toLowerCase()} par Mondial Relay ou Colissimo, en point relais ou à domicile (livraison dès ${formatPrice(SHIPPING_FROM_CENTS)}), avec les fiches numériques offertes tout de suite.`,
      }
    : { q: "Comment je reçois mon pack ?", a: "Juste après le paiement : bouton de téléchargement immédiat et lien envoyé par email (valable 30 jours)." },
  pack.print
    ? {
        q: "C'est un format papier ?",
        a: `Les deux au choix ! En numérique (PDF et images), ou en fiches de poche (${pack.print.specs.join(", ").toLowerCase()}) livrées en ${SHIPPING.zone}, avec la version numérique offerte.`,
      }
    : { q: "C'est un format papier ?", a: "Non, numérique : tu reçois le PDF (idéal pour imprimer) et les fiches en images (idéal sur téléphone)." },
  pack.print
    ? {
        q: "Et si les fiches sont améliorées ?",
        a: "Les mises à jour de la version numérique sont gratuites : tu reçois la nouvelle version, même si tu as pris le format papier.",
      }
    : { q: "Et si les fiches sont améliorées ?", a: "Les mises à jour sont gratuites : tu reçois la nouvelle version des fiches que tu as achetées." },
  { q: "Je n'ai pas reçu l'email", a: `Regarde dans tes spams. Sinon, va sur la page « Retrouver mon achat » (menu ··· en bas de page) : tes liens te sont renvoyés.` },
];

export default async function PackPage({ params }: { params: Params }) {
  const pack = await livePack((await params).slug);
  const env = await getEnvAsync();
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

  const packCount = pack.items.length + (pack.bonus ? 1 : 0);
  const paperPhotos = pack.print?.photos ?? [];

  return (
    <div className="has-sticky-buy sale">
      <OfferBanner />
      <section className="container pdp">
        <header className="pdp__head">
          <h1>{pack.headline}</h1>
          <p className="pdp__promise">{pack.promise}</p>
        </header>

        <div className="pdp__media">
          {pack.images ? (
            // Carrousel : la vraie photo des fiches papier d'abord (si le papier est en vente), puis le visuel du pack et l'aperçu.
            <PackGallery
              slides={[
                ...paperPhotos.map((p) => ({ ...p, label: "Fiches de poche" })),
                ...(pack.revision?.photos ?? []).map((p) => ({ ...p, label: "Fiches de révision" })),
                { src: pack.images.card, alt: pack.images.alt, width: 800, height: 800 },
                ...(pack.images.gallery ?? []),
              ]}
            />
          ) : (
            <PackCover icon={pack.icon} tone={pack.tone} />
          )}
        </div>

        <div className="pdp__body">
          <ul className="pdp__benefits">
            {pack.highlights.map((h) => (
              <li key={h}>
                <Icon name="check" /> {h}
              </li>
            ))}
          </ul>

          <Suspense>
            <CheckoutError />
          </Suspense>
          <PackOffers
            slug={pack.slug}
            packName={pack.name.replace(/^Pack Mémos : /, "Pack ")}
            packCents={pack.priceCents}
            packCount={packCount}
            packImage={pack.digitalImage ?? (pack.images ? { src: pack.images.card, width: 800, height: 800, alt: pack.images.alt } : null)}
            print={
              pack.print
                ? {
                    priceCents: pack.print.priceCents,
                    specs: pack.print.specs,
                    photo: paperPhotos[0] ?? null,
                    soldOut: Boolean(pack.print.soldOut),
                    shippingMethods: availableMethods(env),
                    mondialRelayBrand: relayConfig(env).mondialRelayBrand,
                  }
                : null
            }
            revision={
              pack.revision
                ? { priceCents: pack.revision.priceCents, specs: pack.revision.specs, photo: pack.revision.photos?.[0] ?? null, soldOut: Boolean(pack.revision.soldOut) }
                : null
            }
            bundle={
              pack.bundle && pack.print && pack.revision
                ? {
                    priceCents: pack.bundle.priceCents,
                    specs: [],
                    photo: pack.bundle.photo ?? paperPhotos[0] ?? null,
                    soldOut: Boolean(pack.print.soldOut || pack.revision.soldOut),
                    separateCents: pack.priceCents + pack.print.priceCents + pack.revision.priceCents,
                  }
                : null
            }
            shipping={{ methods: availableMethods(env), mondialRelayBrand: relayConfig(env).mondialRelayBrand }}
            unit={
              pack.unit
                ? {
                    priceCents: pack.unit.priceCents,
                    items: pack.items.slice(0, pack.unit.files.length).map((i) => ({ title: i.title, icon: i.icon })),
                    packCount,
                  }
                : null
            }
          />

          <ul className="pdp__trust">
            <li>
              <Icon name="shield" /> Paiement sécurisé
            </li>
            <li>
              <Icon name="spark" /> Mises à jour offertes
            </li>
            {pack.print ? (
              <li>
                <Icon name="clock" /> Papier : 14 j pour changer d&apos;avis
              </li>
            ) : (
              <li>
                <Icon name="mail" /> Reçu par email
              </li>
            )}
          </ul>
        </div>
      </section>

      <section className="container sale-content" aria-labelledby="contenu-title">
        <h2 id="contenu-title">Dans le pack</h2>
        {pack.previews?.length ? (
          <div className="sale-sheets">
            <SheetPreviews
              sheets={pack.previews.map((p, n) => ({
                ...p,
                title: pack.items[n]?.title ?? "Fiche bonus",
                bonus: n >= pack.items.length,
              }))}
              packLabel={pack.print ? `Obtenir le pack · dès ${formatPrice(pack.priceCents)}` : `Tout le pack · ${formatPrice(pack.priceCents)}`}
              unitLabel={pack.unit ? `Cette fiche seule · ${formatPrice(pack.unit.priceCents)}` : null}
            />
            <p className="sale-sheets__note">
              {packCount} fiches{pack.bonus ? " dont 1 bonus 🎁" : ""} · touche une fiche pour l&apos;agrandir
            </p>
          </div>
        ) : (
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
        )}
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
      </section>

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
        <BuyButton className="btn btn--primary btn--buy sticky-buy__btn">
          {pack.print ? "Choisir ma version" : <>Obtenir · {formatPrice(pack.priceCents)}</>}
        </BuyButton>
      </StickyBuyBar>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </div>
  );
}

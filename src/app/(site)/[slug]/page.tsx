import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPack, publishedPacks } from "@/content/packs";
import { CheckoutError } from "@/components/shop/CheckoutError";
import { PackCheckout } from "@/components/shop/PackCheckout";
import { PackCover } from "@/components/shop/PackCover";
import { StickyBuyBar } from "@/components/shop/StickyBuyBar";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { SITE, formatPrice } from "@/lib/format";
import { jsonLd } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return publishedPacks().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const pack = getPack((await params).slug);
  if (!pack) return {};
  return {
    title: pack.name,
    description: `${pack.promise} ${formatPrice(pack.priceCents)}, PDF reçu par email.`,
    alternates: { canonical: `/${pack.slug}` },
    openGraph: {
      title: pack.name,
      description: pack.tagline,
      ...(pack.images?.og ? { images: [{ url: pack.images.og, width: 1200, height: 630 }] } : {}),
    },
  };
}

const FAQ = [
  { q: "Comment je reçois mon pack ?", a: "Juste après le paiement : bouton de téléchargement immédiat et lien envoyé par email (valable 30 jours)." },
  { q: "C'est un format papier ?", a: "Non, un PDF. Garde-le sur ton téléphone ou imprime-le." },
  { q: "Je n'ai pas reçu l'email", a: "Regarde dans tes spams. Sinon, écris-nous à contact@lapetiteide.fr : on te le renvoie." },
];

export default async function PackPage({ params }: { params: Params }) {
  const pack = getPack((await params).slug);
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

  return (
    <div className="has-sticky-buy sale">
      <section className="container sale-main">
        <div className="sale-main__visual">
          {pack.images ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pack.images.card} alt={pack.images.alt} width={800} height={800} className="sale-main__img" fetchPriority="high" />
          ) : (
            <PackCover icon={pack.icon} tone={pack.tone} />
          )}
        </div>

        <div className="sale-main__info">
          <h1>{pack.headline}</h1>
          <p className="sale-main__promise">{pack.promise}</p>

          <ul className="sale-main__points">
            {pack.highlights.map((h) => (
              <li key={h}>
                <Icon name="check" /> {h}
              </li>
            ))}
          </ul>

          {pack.bonus ? (
            <div className="bonus-card">
              <span className="bonus-card__icon" aria-hidden="true">
                <Icon name="gift" />
              </span>
              <div>
                <p className="bonus-card__label">Bonus inclus</p>
                <p className="bonus-card__title">{pack.bonus.title}</p>
                <p className="bonus-card__text">{pack.bonus.text}</p>
              </div>
            </div>
          ) : null}

          <div className="sale-buy" id="acheter" data-buy-anchor="">
            <div className="sale-buy__price">
              <Price cents={pack.priceCents} compareAt={pack.compareAtPriceCents} />
              <span>PDF · accès immédiat</span>
            </div>
            <Suspense>
              <CheckoutError />
            </Suspense>
            <PackCheckout slug={pack.slug} priceCents={pack.priceCents} />
          </div>
        </div>
      </section>

      {pack.images ? (
        <section className="container sale-preview" aria-labelledby="apercu-title">
          <h2 id="apercu-title">Ce que contient le pack</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pack.images.sale}
            alt={pack.images.alt}
            width={pack.images.saleSize[0]}
            height={pack.images.saleSize[1]}
            className="sale-preview__img"
            loading="lazy"
          />
        </section>
      ) : null}

      <section className="container sale-faq" aria-labelledby="faq-title">
        <h2 id="faq-title">Questions fréquentes</h2>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
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

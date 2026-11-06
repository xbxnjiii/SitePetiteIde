import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPack, publishedPacks } from "@/content/packs";
import { BuyButton } from "@/components/shop/BuyButton";
import { CheckoutError } from "@/components/shop/CheckoutError";
import { PackCover } from "@/components/shop/PackCover";
import { Icon } from "@/components/ui/Icon";
import { Mascot } from "@/components/ui/Mascot";
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
    description: `${pack.tagline} PDF reçu par email — ${formatPrice(pack.priceCents)}.`,
    alternates: { canonical: `/${pack.slug}` },
    openGraph: {
      title: pack.name,
      description: pack.tagline,
      ...(pack.images?.og ? { images: [{ url: pack.images.og, width: 1200, height: 630 }] } : {}),
    },
  };
}

const FAQ = [
  { q: "Comment je reçois mon pack ?", a: "Juste après le paiement : un bouton de téléchargement s'affiche, et tu reçois un email avec ton lien personnel." },
  { q: "Je n'ai pas reçu l'email", a: "Regarde dans tes spams ou l'onglet « Promotions ». Sinon, écris-nous avec l'adresse utilisée lors du paiement : on te le renvoie." },
  { q: "Le téléchargement ne marche pas depuis TikTok / Instagram", a: "Ouvre la page dans Safari ou Chrome (menu « … » puis « Ouvrir dans le navigateur »), ou utilise le lien reçu par email." },
  { q: "Faut-il créer un compte ?", a: "Non. Seule ton adresse email est demandée au moment du paiement." },
];

export default async function PackPage({ params }: { params: Params }) {
  const pack = getPack((await params).slug);
  if (!pack) notFound();
  const others = publishedPacks().filter((p) => p.slug !== pack.slug);

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
    <div className="has-sticky-buy">
      <div className="container">
        <div className="product">
          <div className="product__gallery">
            {pack.images ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pack.images.sale}
                alt={pack.images.alt}
                width={pack.images.saleSize[0]}
                height={pack.images.saleSize[1]}
                className="product__img"
                fetchPriority="high"
              />
            ) : (
              <PackCover icon={pack.icon} tone={pack.tone} />
            )}
          </div>

          <div className="product__info">
            <div className="product__meta">
              {pack.badge ? <span className="badge badge--pink">{pack.badge}</span> : null}
              <span className="badge">{pack.items.length} fiches · PDF</span>
            </div>
            <h1>{pack.name}</h1>
            <p className="product__lead">{pack.tagline}</p>
            <div className="product__price">
              <Price cents={pack.priceCents} compareAt={pack.compareAtPriceCents} />
            </div>

            <Suspense>
              <CheckoutError />
            </Suspense>
            <BuyButton slug={pack.slug} priceCents={pack.priceCents} />

            <ul className="product__reassure">
              <li><Icon name="download" /> Téléchargement immédiat après le paiement</li>
              <li><Icon name="mail" /> Ton lien est aussi envoyé par email</li>
              <li><Icon name="phone" /> Sur ton téléphone, ta tablette ou à imprimer</li>
            </ul>

            <div className="product__sections">
              <section className="panel">
                <h2>Ce que contient le pack</h2>
                <ul className="pack-content">
                  {pack.items.map((item) => (
                    <li key={item.title}>
                      <span className="pack-content__icon"><Icon name={item.icon} /></span>
                      <span>
                        <strong>{item.title}</strong>
                        <span>{item.description}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="panel">
                <h2>Pourquoi ce pack ?</h2>
                <p>{pack.description}</p>
                <ul>
                  {pack.highlights.map((h) => (
                    <li key={h}><Icon name="check" /> {h}</li>
                  ))}
                </ul>
              </section>

              <section className="panel">
                <div className="panel__head">
                  <h2>Questions fréquentes</h2>
                  <Mascot pose="idee" className="panel__mascot" />
                </div>
                <div className="faq faq--flat">
                  {FAQ.map((f) => (
                    <details key={f.q}>
                      <summary>{f.q}</summary>
                      <p>{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>

        {others.length ? (
          <section className="section" style={{ paddingTop: 8 }} aria-labelledby="others-title">
            <h2 id="others-title">Nos autres packs</h2>
            <ul className="bio__list">
              {others.map((p) => (
                <li key={p.slug}>
                  <Link href={`/${p.slug}`} className="bio-card">
                    {p.images ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images.card} alt="" width={800} height={800} className="bio-card__thumb" loading="lazy" />
                    ) : (
                      <PackCover icon={p.icon} tone={p.tone} stacked={false} className="bio-card__cover" />
                    )}
                    <span className="bio-card__body">
                      <span className="bio-card__name">{p.name}</span>
                      <Price cents={p.priceCents} compareAt={p.compareAtPriceCents} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <div className="sticky-buy">
        <BuyButton slug={pack.slug} priceCents={pack.priceCents} compact />
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPack, publishedPacks } from "@/content/packs";
import { BuyButton } from "@/components/shop/BuyButton";
import { CheckoutError } from "@/components/shop/CheckoutError";
import { StickyBuyBar } from "@/components/shop/StickyBuyBar";
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
    description: `${pack.promise} ${formatPrice(pack.priceCents)}, PDF reçu par email.`,
    alternates: { canonical: `/${pack.slug}` },
    openGraph: {
      title: pack.name,
      description: pack.tagline,
      ...(pack.images?.og ? { images: [{ url: pack.images.og, width: 1200, height: 630 }] } : {}),
    },
  };
}

const STEPS = [
  { icon: "shield", title: "Tu paies en 30 secondes", text: "Apple Pay, Google Pay ou carte bancaire. Sans créer de compte." },
  { icon: "mail", title: "Tu reçois ton PDF", text: "Téléchargement immédiat, et ton lien arrive aussi par email." },
  { icon: "phone", title: "Tu l'as toujours sur toi", text: "Sur ton téléphone en stage, ta tablette, ou imprimé." },
] as const;

const FAQ = [
  { q: "Comment je reçois mon pack ?", a: "Juste après le paiement, un bouton de téléchargement s'affiche. Tu reçois aussi un email avec ton lien personnel, valable 30 jours." },
  { q: "C'est un livre papier ?", a: "Non, c'est un fichier PDF à télécharger. Tu peux le garder sur ton téléphone ou l'imprimer chez toi." },
  { q: "Je n'ai pas reçu l'email", a: "Regarde dans tes spams ou l'onglet « Promotions ». Sinon, écris-nous avec l'adresse utilisée lors du paiement : on te le renvoie." },
  { q: "Le téléchargement ne marche pas depuis TikTok / Instagram", a: "Ouvre la page dans Safari ou Chrome (menu « … » puis « Ouvrir dans le navigateur »), ou utilise le lien reçu par email." },
  { q: "Faut-il créer un compte ?", a: "Non. Seule ton adresse email est demandée au moment du paiement." },
];

export default async function PackPage({ params }: { params: Params }) {
  const pack = getPack((await params).slug);
  if (!pack) notFound();
  const others = publishedPacks().filter((p) => p.slug !== pack.slug);
  const perItem = pack.items.length > 1 ? pack.priceCents / pack.items.length : null;

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
      {/* ===== 1. Accroche + achat, visibles sans défiler ===== */}
      <section className="sale-hero">
        <div className="container sale-hero__grid">
          <div className="sale-hero__visual">
            {pack.images ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pack.images.sale}
                alt={pack.images.alt}
                width={pack.images.saleSize[0]}
                height={pack.images.saleSize[1]}
                className="sale-hero__img"
                fetchPriority="high"
              />
            ) : (
              <PackCover icon={pack.icon} tone={pack.tone} />
            )}
          </div>

          <div className="sale-hero__text">
            <p className="sale-hero__eyebrow">
              {pack.name} · {pack.items.length} fiches mémo
            </p>
            <h1>{pack.headline}</h1>
            <p className="sale-hero__promise">{pack.promise}</p>

            <div className="sale-offer">
              <div className="sale-offer__price">
                <Price cents={pack.priceCents} compareAt={pack.compareAtPriceCents} />
                {perItem ? <span className="sale-offer__unit">soit environ {formatPrice(Math.round(perItem))} la fiche</span> : null}
              </div>
              <Suspense>
                <CheckoutError />
              </Suspense>
              <BuyButton slug={pack.slug} priceCents={pack.priceCents} label="Je veux le pack" />
              <ul className="sale-offer__trust">
                <li><Icon name="download" /> PDF reçu immédiatement</li>
                <li><Icon name="shield" /> Paiement 100 % sécurisé</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="container sale-body">
        {/* ===== 2. Contenu : scannable en un coup d'œil ===== */}
        <section className="sale-section" aria-labelledby="contenu-title">
          <h2 id="contenu-title">Ce que tu vas trouver dans le pack</h2>
          <ul className="sale-items">
            {pack.items.map((item) => (
              <li key={item.title} className="sale-item">
                <span className="sale-item__icon"><Icon name={item.icon} /></span>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ===== 3. Bénéfices ===== */}
        <section className="sale-section sale-benefits" aria-labelledby="pourquoi-title">
          <div className="sale-benefits__head">
            <h2 id="pourquoi-title">Pourquoi tu vas l&apos;adorer</h2>
            <Mascot pose="coucou" className="sale-benefits__mascot" />
          </div>
          <div className="sale-benefits__grid">
            {pack.highlights.map((h) => (
              <div key={h.title} className="sale-benefit">
                <Icon name="check" />
                <div>
                  <h3>{h.title}</h3>
                  <p>{h.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== 4. Pour qui ===== */}
        <section className="sale-section sale-audience" aria-labelledby="pourqui-title">
          <h2 id="pourqui-title">Ce pack est fait pour toi si…</h2>
          <ul>
            {pack.audience.map((a) => (
              <li key={a}><span aria-hidden="true">💙</span> {a}</li>
            ))}
          </ul>
        </section>

        {/* ===== 5. Comment ça marche ===== */}
        <section className="sale-section" aria-labelledby="etapes-title">
          <h2 id="etapes-title">Comment ça marche ?</h2>
          <ol className="sale-steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="sale-steps__num">{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ===== 6. Relance d'achat ===== */}
        <section className="sale-cta" aria-labelledby="cta-title">
          <Mascot pose="pouce" className="sale-cta__mascot" />
          <h2 id="cta-title">Prêt·e pour ton prochain stage ?</h2>
          <p>
            {pack.items.length} fiches mémo pour {formatPrice(pack.priceCents)}, dans ta boîte mail en quelques secondes.
          </p>
          <BuyButton slug={pack.slug} priceCents={pack.priceCents} label="Je veux le pack" />
        </section>

        {/* ===== 7. FAQ ===== */}
        <section className="sale-section" aria-labelledby="faq-title">
          <div className="sale-benefits__head">
            <h2 id="faq-title">Questions fréquentes</h2>
            <Mascot pose="idee" className="sale-benefits__mascot" />
          </div>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {others.length ? (
          <section className="sale-section" aria-labelledby="others-title">
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
                    <span className="bio-card__row">
                      <span className="bio-card__body">
                        <span className="bio-card__name">{p.name}</span>
                        <span className="bio-card__desc">{p.tagline}</span>
                      </span>
                      <span className="bio-card__arrow" aria-hidden="true"><Icon name="arrow" /></span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {/* Barre d'achat fixe (mobile) */}
      <StickyBuyBar>
        <div className="sticky-buy__price">
          <span>{pack.name}</span>
          <Price cents={pack.priceCents} />
        </div>
        <BuyButton slug={pack.slug} priceCents={pack.priceCents} compact label="Acheter" />
      </StickyBuyBar>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </div>
  );
}

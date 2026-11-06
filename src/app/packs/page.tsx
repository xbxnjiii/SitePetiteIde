import type { Metadata } from "next";
import Link from "next/link";
import { publishedPacks } from "@/content/packs";
import { Footer } from "@/components/layout/Footer";
import { OfferBanner } from "@/components/shop/OfferBanner";
import { PackCover } from "@/components/shop/PackCover";
import { SourceLink } from "@/components/shop/SourceLink";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Tous les packs",
  description: "Tous les packs de fiches mémo La Petite IDE pour réviser efficacement.",
  alternates: { canonical: "/packs" },
};

// Liste de tous les packs, dans le style de la page de liens (sans les réseaux sociaux).
export default function PacksPage() {
  const packs = publishedPacks();
  return (
    <div className="bio">
      <OfferBanner />
      <main id="contenu" className="bio__inner">
        <header className="bio__head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-rond-512.webp" alt="Logo La Petite IDE" width={256} height={256} className="bio__avatar" />
          <h1 className="bio__name">
            Tous les <span>packs</span>
          </h1>
          <p className="bio__tagline">
            {packs.length} pack{packs.length > 1 ? "s" : ""} de fiches mémo pour réviser en un clin d&apos;œil 💙
          </p>
        </header>

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
                  <span className="bio-card__arrow" aria-hidden="true">
                    <Icon name="arrow" />
                  </span>
                </span>
              </SourceLink>
            </li>
          ))}
        </ul>

        <Link href="/" className="back-home">
          <Icon name="arrow" />
          Retour à l&apos;accueil
        </Link>
      </main>
      <Footer social={false} compact />
    </div>
  );
}

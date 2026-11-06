import Link from "next/link";
import { CategoryCard } from "@/components/shop/CategoryCard";
import { ProductCover } from "@/components/shop/ProductCover";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { Icon } from "@/components/ui/Icon";
import { Mascot } from "@/components/ui/Mascot";
import { Price } from "@/components/ui/Price";
import { countProductsByCategory, getCategories, getFeaturedProducts, getPackItems, getProduct } from "@/lib/catalog";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const BENEFITS = [
  { icon: "spark", title: "Clairs et synthétiques", text: "L'essentiel, sans blabla : des fiches pensées pour être comprises du premier coup." },
  { icon: "book", title: "Pensés pour l'IFSI", text: "Des contenus alignés sur ta formation, du premier semestre au diplôme." },
  { icon: "download", title: "Téléchargement immédiat", text: "Ton PDF est disponible dès le paiement validé, et envoyé par email." },
  { icon: "phone", title: "Accessibles partout", text: "Sur ton téléphone en stage, ta tablette ou imprimés : à toi de choisir." },
] as const;

export default async function HomePage() {
  const [featured, categories, counts, pack] = await Promise.all([
    getFeaturedProducts(4),
    getCategories(),
    countProductsByCategory(),
    getProduct("pack-des-constantes"),
  ]);
  const packItems = pack ? await getPackItems(pack) : [];

  return (
    <>
      {/* ----- Hero ----- */}
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__text">
            <span className="eyebrow">Pour les étudiants infirmiers</span>
            <h1>
              Tes études infirmières, <span>un peu plus simples</span> au quotidien&nbsp;!
            </h1>
            <p>
              Des fiches, mémos et outils pratiques conçus pour t&apos;accompagner tout au long de ta formation en soins
              infirmiers.
            </p>
            <div className="hero__ctas">
              <Link href="/boutique" className="btn btn--primary">
                Découvrir la boutique
              </Link>
              <Link href="/packs" className="btn btn--secondary">
                Découvrir nos packs
              </Link>
            </div>
            <div className="hero__trust">
              <span><Icon name="check" /> PDF téléchargeable immédiatement</span>
              <span><Icon name="check" /> Paiement sécurisé</span>
            </div>
          </div>
          <div className="hero__visual">
            <Mascot className="hero__mascot" />
            <span className="hero__bubble hero__bubble--a"><Icon name="heart" /> Constantes</span>
            <span className="hero__bubble hero__bubble--b"><Icon name="syringe" /> Gestes techniques</span>
          </div>
        </div>
      </section>

      {/* ----- Produits populaires ----- */}
      <section className="section" style={{ paddingTop: 24 }} aria-labelledby="pop-title">
        <div className="container">
          <div className="section-head section-head--row">
            <div>
              <span className="eyebrow">Les plus téléchargés</span>
              <h2 id="pop-title">Produits populaires</h2>
            </div>
            <Link href="/boutique" className="btn btn--ghost">
              Tout voir <Icon name="arrow" />
            </Link>
          </div>
          <ProductGrid products={featured} />
        </div>
      </section>

      {/* ----- Catégories ----- */}
      <section className="section" style={{ background: "#fff" }} aria-labelledby="cat-title">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Explorer</span>
            <h2 id="cat-title">Trouve la ressource qu&apos;il te faut</h2>
            <p>Révisions, soins, gestes techniques ou organisation : chaque famille de supports a sa catégorie.</p>
          </div>
          <div className="grid-categories">
            {categories.map((c) => (
              <CategoryCard key={c.slug} category={c} count={counts[c.slug] ?? 0} />
            ))}
          </div>
        </div>
      </section>

      {/* ----- Avantages ----- */}
      <section className="section" aria-labelledby="why-title">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Pourquoi La Petite IDE</span>
            <h2 id="why-title">Des supports qui te simplifient la vie</h2>
          </div>
          <div className="benefits">
            {BENEFITS.map((b) => (
              <div key={b.title} className="benefit">
                <span className="benefit__icon"><Icon name={b.icon} /></span>
                <div>
                  <h3>{b.title}</h3>
                  <p>{b.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----- Mise en avant pack ----- */}
      {pack ? (
        <section className="section" style={{ paddingTop: 0 }} aria-labelledby="pack-title">
          <div className="container">
            <div className="pack-promo">
              <div style={{ position: "relative", zIndex: 1 }}>
                <span className="eyebrow">Offre groupée</span>
                <h2 id="pack-title">{pack.name}</h2>
                <p>{pack.shortDescription} Un seul achat, tous les PDF.</p>
                <ul className="pack-promo__list">
                  {packItems.map((p) => (
                    <li key={p.slug}><Icon name="check" /> {capitalize(p.name.replace(/^Mémo /, ""))}</li>
                  ))}
                </ul>
                <div className="pack-promo__price">
                  <Price cents={pack.priceCents} compareAt={pack.compareAtPriceCents} />
                </div>
                <div className="hero__ctas" style={{ marginTop: 0 }}>
                  <Link href={`/produit/${pack.slug}`} className="btn btn--primary">
                    Découvrir le pack
                  </Link>
                  <Link href="/packs" className="btn btn--accent">
                    Tous nos packs
                  </Link>
                </div>
              </div>
              <div className="pack-promo__visual">
                <ProductCover product={pack} />
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

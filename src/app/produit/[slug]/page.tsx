import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButtons } from "@/components/shop/AddToCartButtons";
import { ProductCover } from "@/components/shop/ProductCover";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { getCategory, getPackItems, getPacksContaining, getProduct, getProducts, getRelatedProducts } from "@/lib/catalog";
import { SITE, formatPrice } from "@/lib/format";
import { jsonLd } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  return {
    title: product.name,
    description: `${product.shortDescription} PDF de ${product.pageCount} pages — ${formatPrice(product.priceCents)}.`,
    alternates: { canonical: `/produit/${product.slug}` },
    openGraph: { title: product.name, description: product.shortDescription, type: "website" },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const [category, packItems, packs, related] = await Promise.all([
    getCategory(product.categorySlug),
    getPackItems(product),
    getPacksContaining(product),
    getRelatedProducts(product, 4),
  ]);
  const isPack = product.type === "pack";

  const structured = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.id,
    category: category?.name,
    brand: { "@type": "Brand", name: SITE.name },
    offers: {
      "@type": "Offer",
      url: `${SITE.url}/produit/${product.slug}`,
      priceCurrency: "EUR",
      price: (product.priceCents / 100).toFixed(2),
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="has-sticky-buy">
      <div className="container">
        <div className="page-head" style={{ paddingBottom: 0 }}>
          <Breadcrumb
            items={[
              { label: "Boutique", href: "/boutique" },
              ...(category ? [{ label: category.name, href: `/categorie/${category.slug}` }] : []),
              { label: product.name },
            ]}
          />
        </div>

        <div className="product">
          <ProductGallery product={product} />

          <div className="product__info">
            <div className="product__meta">
              {isPack ? <span className="badge badge--pink">Pack · {packItems.length} PDF</span> : null}
              {category ? <span className="badge">{category.name}</span> : null}
            </div>
            <h1>{product.name}</h1>
            <p className="product__lead">{product.shortDescription}</p>
            <div className="product__price">
              <Price cents={product.priceCents} compareAt={product.compareAtPriceCents} />
            </div>

            <AddToCartButtons slug={product.slug} />

            <ul className="product__reassure">
              <li><Icon name="download" /> Téléchargement immédiat après paiement</li>
              <li><Icon name="mail" /> Liens de téléchargement envoyés par email</li>
              <li><Icon name="phone" /> Lisible sur téléphone, tablette ou à imprimer</li>
            </ul>

            {packs.length ? (
              <div className="pack-hint">
                Ce produit est aussi inclus dans{" "}
                {packs.map((p, i) => (
                  <span key={p.slug}>
                    {i > 0 ? ", " : ""}
                    <Link href={`/produit/${p.slug}`}>{p.name}</Link> ({formatPrice(p.priceCents)})
                  </span>
                ))}
                .
              </div>
            ) : null}

            <div className="product__sections">
              <section className="panel">
                <h2>Description</h2>
                <p>{product.description}</p>
              </section>

              <section className="panel">
                <h2>Caractéristiques</h2>
                <dl className="spec">
                  <div><dt>Format</dt><dd>PDF</dd></div>
                  <div><dt>Pages</dt><dd>{product.pageCount}</dd></div>
                  <div><dt>{isPack ? "Fichiers" : "Fichier"}</dt><dd>{isPack ? packItems.length : 1}</dd></div>
                </dl>
              </section>

              {product.learningObjectives.length ? (
                <section className="panel">
                  <h2>Objectifs pédagogiques</h2>
                  <ul>
                    {product.learningObjectives.map((o) => (
                      <li key={o}><Icon name="check" /> {o}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {isPack ? (
                <section className="panel">
                  <h2>Contenu du pack</h2>
                  <div className="pack-items">
                    {packItems.map((p) => (
                      <Link key={p.slug} href={`/produit/${p.slug}`} className="pack-item">
                        <ProductCover product={p} />
                        <div>
                          <div className="pack-item__name">{p.name}</div>
                          <div className="pack-item__meta">PDF · {p.pageCount} pages · {formatPrice(p.priceCents)} à l&apos;unité</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : product.contents.length ? (
                <section className="panel">
                  <h2>Contenu du fichier</h2>
                  <ul>
                    {product.contents.map((c) => (
                      <li key={c}><Icon name="note" /> {c}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </div>
        </div>

        <section className="section" style={{ paddingTop: 16 }} aria-labelledby="related-title">
          <div className="section-head">
            <h2 id="related-title">Vous pourriez aussi aimer</h2>
          </div>
          <ProductGrid products={related} />
        </section>
      </div>

      <div className="sticky-buy">
        <Price cents={product.priceCents} />
        <AddToCartButtons slug={product.slug} compact />
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </div>
  );
}

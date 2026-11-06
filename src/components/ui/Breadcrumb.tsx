import Link from "next/link";
import { SITE } from "@/lib/format";
import { jsonLd as toJsonLd } from "@/lib/seo";

export interface Crumb {
  label: string;
  href?: string;
}

/** Fil d'Ariane + données structurées BreadcrumbList (SEO). */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ label: "Accueil", href: "/" }, ...items];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${SITE.url}${c.href}` } : {}),
    })),
  };
  return (
    <nav className="breadcrumb" aria-label="Fil d'Ariane">
      <ol>
        {all.map((c, i) => (
          <li key={i}>{c.href && i < all.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}</li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={toJsonLd(jsonLd)} />
    </nav>
  );
}

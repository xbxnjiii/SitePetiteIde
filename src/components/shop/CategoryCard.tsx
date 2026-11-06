import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { Category } from "@/lib/types";

export function CategoryCard({ category, count }: { category: Category; count?: number }) {
  return (
    <Link href={`/categorie/${category.slug}`} className={`cat-card cat-card--${category.tone}`}>
      <span className="cat-card__icon">
        <Icon name={category.icon} />
      </span>
      <h3>{category.name}</h3>
      <p>{category.description}</p>
      {count !== undefined ? (
        <span className="cat-card__count">
          {count} ressource{count > 1 ? "s" : ""} →
        </span>
      ) : null}
    </Link>
  );
}

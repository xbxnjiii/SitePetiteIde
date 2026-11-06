"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "./nav";

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/boutique") return pathname.startsWith("/boutique") || pathname.startsWith("/categorie") || pathname.startsWith("/produit");
  return pathname.startsWith(href);
}

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="Navigation principale">
      {NAV_LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={isActive(pathname, l.href) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

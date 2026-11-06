"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { SITE } from "@/lib/format";
import { NAV_LINKS } from "./nav";
import { isActive } from "./NavLinks";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Ferme le menu à chaque changement de page.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="icon-btn menu-toggle"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name={open ? "close" : "menu"} />
      </button>
      {open ? (
        <nav id="mobile-menu" className="mobile-menu" aria-label="Menu mobile">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isActive(pathname, l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
          <Link href="/panier">Mon panier</Link>
          <Link href="/faq">FAQ</Link>
          <div className="mobile-menu__social">
            <a href={SITE.social.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a>
            <a href={SITE.social.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
          </div>
        </nav>
      ) : null}
    </>
  );
}

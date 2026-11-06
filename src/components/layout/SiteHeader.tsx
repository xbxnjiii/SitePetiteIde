import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function SiteHeader() {
  return (
    <header className="header">
      <div className="container header__inner">
        <Logo />
        <Link href="/" className="btn btn--ghost btn--sm">
          Tous les packs
        </Link>
      </div>
    </header>
  );
}

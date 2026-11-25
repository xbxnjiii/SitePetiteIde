import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { CartLink } from "@/components/shop/CartLink";

export function SiteHeader() {
  return (
    <header className="header">
      <div className="container header__inner">
        <Logo />
        <div className="header__actions">
          <Link href="/packs" className="header__packs">
            <Icon name="layers" />
            <span>Tous les packs</span>
          </Link>
          <CartLink />
        </div>
      </div>
    </header>
  );
}

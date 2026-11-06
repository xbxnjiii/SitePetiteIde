import { CartButton } from "@/components/shop/CartButton";
import { Logo } from "@/components/ui/Logo";
import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";

export function Header() {
  return (
    <header className="header">
      <div className="container header__inner">
        <Logo />
        <NavLinks />
        <div className="header__actions">
          {/* Accès au compte client : prévu en V2 */}
          <CartButton />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

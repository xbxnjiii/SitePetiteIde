import Link from "next/link";
import { Mascot } from "@/components/ui/Mascot";

export default function NotFound() {
  return (
    <div className="container section">
      <div className="empty">
        <Mascot className="mascot" />
        <h1 style={{ fontSize: "1.8rem" }}>Oups, page introuvable</h1>
        <p>Cette page n&apos;existe pas ou plus. Mais la boutique, elle, est toujours là !</p>
        <Link href="/boutique" className="btn btn--primary">Aller à la boutique</Link>
      </div>
    </div>
  );
}

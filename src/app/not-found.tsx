import Link from "next/link";
import { Mascot } from "@/components/ui/Mascot";

export default function NotFound() {
  return (
    <main id="contenu" className="container">
      <div className="thanks">
        <Mascot pose="question" className="thanks__mascot" />
        <h1>Oups, page introuvable</h1>
        <p>Cette page n&apos;existe pas ou plus.</p>
        <Link href="/" className="btn btn--primary">Voir nos packs</Link>
      </div>
    </main>
  );
}

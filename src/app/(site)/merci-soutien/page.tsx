import type { Metadata } from "next";
import Link from "next/link";
import { Mascot } from "@/components/ui/Mascot";

export const metadata: Metadata = { title: "Merci pour ton soutien", robots: { index: false } };

export default function TipThanksPage() {
  return (
    <div className="container">
      <div className="thanks">
        <Mascot pose="bravo" className="thanks__mascot" />
        <h1>Merci pour ton soutien ! 💙</h1>
        <p>Grâce à toi, on peut continuer à créer de nouvelles fiches et de nouveaux quiz. Ton reçu de paiement t&apos;arrive par email.</p>
        <Link href="/" className="btn btn--primary">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}

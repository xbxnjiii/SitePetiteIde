import type { Metadata } from "next";
import Link from "next/link";
import { Mascot } from "@/components/ui/Mascot";
import { SITE } from "@/lib/format";

export const metadata: Metadata = { title: "Téléchargement impossible", robots: { index: false } };

const REASONS: Record<string, string> = {
  lien: "Ce lien de téléchargement n'est pas valide ou a expiré.",
  commande: "Nous n'avons pas trouvé de paiement validé pour ce lien.",
  rembourse: "Cette commande a été remboursée : l'accès aux fichiers n'est plus disponible.",
  fichier: "Le fichier est momentanément indisponible. Nous avons été prévenues et réglons ça au plus vite.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function DownloadErrorPage({ searchParams }: { searchParams: Search }) {
  const r = (await searchParams).raison;
  const message = (typeof r === "string" && REASONS[r]) || REASONS.lien;
  return (
    <div className="container">
      <div className="thanks">
        <Mascot className="thanks__mascot" />
        <h1>Téléchargement impossible</h1>
        <p>{message}</p>
        <p>
          Besoin d&apos;aide ? Écris-nous à <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> en indiquant
          l&apos;adresse email utilisée lors de ton achat.
        </p>
        <Link href="/" className="btn btn--primary">Retour à l&apos;accueil</Link>
      </div>
    </div>
  );
}

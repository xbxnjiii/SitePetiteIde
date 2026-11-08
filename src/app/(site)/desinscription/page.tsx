import type { Metadata } from "next";
import Link from "next/link";
import { Mascot } from "@/components/ui/Mascot";
import { SITE } from "@/lib/format";

export const metadata: Metadata = { title: "Désinscription", robots: { index: false } };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function UnsubscribePage({ searchParams }: { searchParams: Search }) {
  const error = Boolean((await searchParams).erreur);
  return (
    <div className="container">
      <div className="thanks">
        <Mascot pose={error ? "question" : "coucou"} className="thanks__mascot" />
        <h1>{error ? "Lien invalide" : "C'est noté 👋"}</h1>
        <p>
          {error ? (
            <>
              Ce lien de désinscription n&apos;est plus valide. Écris-nous à{" "}
              <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> et on s&apos;en occupe.
            </>
          ) : (
            "Tu ne recevras plus nos emails de révision. Tu peux toujours revenir faire un quiz quand tu veux !"
          )}
        </p>
        <Link href="/quiz" className="btn btn--primary">
          Faire un quiz
        </Link>
      </div>
    </div>
  );
}

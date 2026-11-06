import type { Metadata } from "next";
import Link from "next/link";
import { RecoverForm } from "@/components/shop/RecoverForm";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Mascot } from "@/components/ui/Mascot";

export const metadata: Metadata = {
  title: "Retrouver mon achat",
  description: "Reçois à nouveau tes liens de téléchargement La Petite IDE par email.",
  alternates: { canonical: "/retrouver-mon-achat" },
};

export default function RecoverPage() {
  return (
    <div className="container legal">
      <header className="legal__head contact__head">
        <Breadcrumb items={[{ label: "Retrouver mon achat" }]} />
        <Mascot pose="lecture" className="contact__mascot" />
        <h1>Retrouver mon achat</h1>
        <p className="legal__intro">
          Lien perdu ou expiré ? Indique l&apos;email utilisé lors de ton achat : on t&apos;envoie de nouveaux liens.
        </p>
      </header>
      <RecoverForm />
      <p className="contact__tip">
        Toujours rien ? <Link href="/contact">Contacte-nous</Link>.
      </p>
    </div>
  );
}

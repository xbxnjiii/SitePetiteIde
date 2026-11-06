import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Icon } from "@/components/ui/Icon";
import { SITE } from "@/lib/format";

export const metadata: Metadata = {
  title: "Contact",
  description: "Une question sur une commande ou un produit ? Contacte l'équipe La Petite IDE.",
  alternates: { canonical: "/contact" },
};

// V1 : contact par email et réseaux sociaux (pas de formulaire, donc pas de
// traitement serveur ni de spam à gérer). Un formulaire pourra être ajouté plus tard.
export default function ContactPage() {
  return (
    <div className="container">
      <header className="page-head">
        <Breadcrumb items={[{ label: "Contact" }]} />
        <h1>Nous contacter</h1>
        <p>Une question sur une commande, un fichier ou un produit ? On te répond rapidement.</p>
      </header>
      <div className="prose">
        <div className="benefits" style={{ gridTemplateColumns: "1fr" }}>
          <a className="benefit" href={`mailto:${SITE.contactEmail}`} style={{ textDecoration: "none", color: "inherit" }}>
            <span className="benefit__icon"><Icon name="mail" /></span>
            <div>
              <h2 style={{ fontSize: "1rem", marginBottom: 4 }}>Par email</h2>
              <p>{SITE.contactEmail}</p>
            </div>
          </a>
          <a className="benefit" href={SITE.social.instagram} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="benefit__icon"><Icon name="instagram" /></span>
            <div>
              <h2 style={{ fontSize: "1rem", marginBottom: 4 }}>Sur Instagram</h2>
              <p>Écris-nous en message privé.</p>
            </div>
          </a>
          <a className="benefit" href={SITE.social.tiktok} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="benefit__icon"><Icon name="tiktok" /></span>
            <div>
              <h2 style={{ fontSize: "1rem", marginBottom: 4 }}>Sur TikTok</h2>
              <p>Retrouve nos vidéos et nos conseils.</p>
            </div>
          </a>
        </div>
        <p style={{ marginTop: 20 }}>
          Pour une question sur une commande, pense à indiquer ton numéro de commande (il figure dans l&apos;email de confirmation).
        </p>
      </div>
    </div>
  );
}

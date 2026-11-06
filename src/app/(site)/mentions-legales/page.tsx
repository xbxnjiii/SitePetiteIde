import type { Metadata } from "next";
import { LEGAL } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const metadata: Metadata = { title: "Mentions légales", alternates: { canonical: "/mentions-legales" } };

// GABARIT — à compléter avec les informations réelles et à faire relire.
export default function LegalNoticePage() {
  return (
    <div className="container">
      <header className="page-head">
        <Breadcrumb items={[{ label: "Mentions légales" }]} />
        <h1>Mentions légales</h1>
      </header>
      <div className="prose">
        <h2>Éditeur du site</h2>
        <p>
          Le site lapetiteide.fr est édité par {LEGAL.owner} EI, exerçant sous le nom commercial « {LEGAL.tradeName} ».<br />
          Statut : {LEGAL.status}.<br />
          Adresse : {LEGAL.address}.<br />
          SIRET : {LEGAL.siret} — code APE / NAF : {LEGAL.naf}.<br />
          TVA : {LEGAL.vat}.<br />
          Responsable de la publication : {LEGAL.owner}.<br />
          Contact : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        </p>
        <h2>Hébergement</h2>
        <p>
          Site hébergé par Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis — www.cloudflare.com.
        </p>
        <h2>Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble des contenus du site et des fichiers vendus (textes, illustrations, mascotte, logo, PDF) est la propriété
          exclusive de La Petite IDE. Toute reproduction, diffusion ou revente, totale ou partielle, sans autorisation écrite est
          interdite.
        </p>
        <h2>Contenus pédagogiques</h2>
        <p>
          Les supports proposés sont des outils d&apos;aide à l&apos;apprentissage. Ils ne remplacent ni les cours dispensés en IFSI,
          ni les protocoles des établissements, ni l&apos;encadrement par les professionnels de santé.
        </p>
      </div>
    </div>
  );
}

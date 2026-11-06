import type { Metadata } from "next";
import { Todo } from "@/components/content/Todo";
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
          Le site lapetiteide.fr est édité par <Todo>dénomination ou nom, forme juridique</Todo>, dont le siège est situé{" "}
          <Todo>adresse</Todo>, immatriculé sous le numéro <Todo>SIREN / SIRET</Todo>.<br />
          Numéro de TVA intracommunautaire : <Todo>numéro, ou mention « TVA non applicable, art. 293 B du CGI »</Todo>.<br />
          Directrice de la publication : <Todo>nom</Todo>.<br />
          Contact : <Todo>email</Todo>.
        </p>
        <h2>Hébergement</h2>
        <p>
          Site hébergé par Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis — www.cloudflare.com.<br />
          Base de données : Supabase, Inc. (serveurs situés dans l&apos;Union européenne).
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

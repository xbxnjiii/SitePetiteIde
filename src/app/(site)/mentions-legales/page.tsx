import type { Metadata } from "next";
import { InfoList, LegalPage } from "@/components/content/LegalPage";
import { LEGAL } from "@/lib/format";

export const metadata: Metadata = { title: "Mentions légales", alternates: { canonical: "/mentions-legales" } };

export default function LegalNoticePage() {
  return (
    <LegalPage
      title="Mentions légales"
      updatedAt={LEGAL.updatedAt}
      sections={[
        {
          id: "editeur",
          title: "Éditeur du site",
          content: (
            <InfoList
              items={[
                ["Nom commercial", LEGAL.tradeName],
                ["Exploitant", `${LEGAL.owner} EI`],
                ["Statut", LEGAL.status],
                ["Adresse", LEGAL.address],
                ["SIRET", LEGAL.siret],
                ["Code APE / NAF", LEGAL.naf],
                ["TVA", LEGAL.vat],
                ["Email", <a key="m" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>],
                ["Téléphone", <a key="t" href={`tel:${LEGAL.phoneHref}`}>{LEGAL.phone}</a>],
                ["Responsable de la publication", LEGAL.owner],
              ]}
            />
          ),
        },
        {
          id: "hebergement",
          title: "Hébergement",
          content: (
            <InfoList
              items={[
                ["Hébergeur", "Cloudflare, Inc."],
                ["Adresse", "101 Townsend St, San Francisco, CA 94107, États-Unis"],
                ["Site", <a key="c" href="https://www.cloudflare.com" target="_blank" rel="noopener noreferrer">cloudflare.com</a>],
              ]}
            />
          ),
        },
        {
          id: "propriete",
          title: "Propriété intellectuelle",
          content: (
            <p>
              L&apos;ensemble des contenus du site et des fichiers vendus (textes, illustrations, mascotte, logo, fiches en PDF et en images) est la propriété
              exclusive de {LEGAL.tradeName}. Toute reproduction, diffusion ou revente, totale ou partielle, sans autorisation écrite
              est interdite.
            </p>
          ),
        },
        {
          id: "contenus",
          title: "Contenus pédagogiques",
          content: (
            <p>
              Les fiches proposées sont des supports de révision. Elles ne remplacent ni les cours dispensés en IFSI, ni les
              protocoles des établissements de santé, ni l&apos;avis des professionnels de santé.
            </p>
          ),
        },
      ]}
    />
  );
}

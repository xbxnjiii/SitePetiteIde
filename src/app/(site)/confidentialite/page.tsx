import type { Metadata } from "next";
import { InfoList, LegalPage } from "@/components/content/LegalPage";
import { LEGAL } from "@/lib/format";

export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/confidentialite" } };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      intro="On collecte le strict minimum : juste ce qu'il faut pour t'envoyer tes fiches."
      updatedAt={LEGAL.updatedAt}
      sections={[
        {
          id: "responsable",
          title: "Responsable du traitement",
          content: (
            <InfoList
              items={[
                ["Responsable", `${LEGAL.owner} EI — « ${LEGAL.tradeName} »`],
                ["Adresse", LEGAL.address],
                ["Contact", <a key="m" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>],
              ]}
            />
          ),
        },
        {
          id: "donnees",
          title: "Données collectées",
          content: (
            <ul>
              <li>Lors d&apos;un achat : adresse email, pays de facturation, contenu et montant de la commande.</li>
              <li>Pour une commande papier : nom et adresse de livraison.</li>
              <li>Les données bancaires sont traitées exclusivement par Stripe : nous n&apos;y avons jamais accès.</li>
            </ul>
          ),
        },
        {
          id: "finalites",
          title: "Pourquoi ces données",
          content: (
            <ul>
              <li>Traiter ta commande, t&apos;envoyer tes fichiers et, pour le papier, expédier tes fiches (exécution du contrat).</li>
              <li>Tenir la comptabilité (obligation légale).</li>
            </ul>
          ),
        },
        {
          id: "conservation",
          title: "Durée de conservation",
          content: (
            <ul>
              <li>Données de commande : 10 ans (obligations comptables).</li>
              <li>Journaux techniques du site : quelques jours.</li>
            </ul>
          ),
        },
        {
          id: "prestataires",
          title: "Prestataires",
          content: (
            <>
              <InfoList
                items={[
                  ["Cloudflare", "Hébergement du site et stockage des fichiers"],
                  ["Stripe", "Paiement et historique des commandes"],
                  ["Resend", "Envoi des emails de commande"],
                  ["La Poste", "Livraison des fiches papier (nom et adresse de livraison)"],
                ]}
              />
              <p className="legal__note">
                Ces prestataires sont établis aux États-Unis ; les transferts de données sont encadrés par le Data Privacy Framework
                et/ou les clauses contractuelles types de la Commission européenne.
              </p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "Cookies",
          content: (
            <p>
              Aucun cookie publicitaire ni de mesure d&apos;audience. Seuls les éléments strictement nécessaires au paiement sécurisé
              sont utilisés. Nous mesurons la fréquentation du site avec Cloudflare Web Analytics, de façon anonyme et sans cookie
              (pages vues, pays, type d&apos;appareil). Si tu arrives sur le site par un lien de nos réseaux, le nom du réseau
              (ex. « tiktok ») est enregistré avec ta commande, sans aucune autre information.
            </p>
          ),
        },
        {
          id: "droits",
          title: "Tes droits",
          content: (
            <p>
              Tu peux accéder à tes données, les rectifier, les effacer, limiter leur traitement ou t&apos;y opposer. Écris-nous à{" "}
              <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Tu peux aussi adresser une réclamation à la{" "}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">CNIL</a>.
            </p>
          ),
        },
      ]}
    />
  );
}

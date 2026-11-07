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
              <li>Les données bancaires sont traitées exclusivement par Stripe : nous n&apos;y avons jamais accès.</li>
            </ul>
          ),
        },
        {
          id: "finalites",
          title: "Pourquoi ces données",
          content: (
            <ul>
              <li>Traiter ta commande et t&apos;envoyer tes fiches numériques (exécution du contrat).</li>
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
          id: "quiz",
          title: "Classement des quiz",
          content: (
            <p>
              Si tu choisis d&apos;inscrire ton score au classement, nous enregistrons le pseudo que tu indiques, ton score et ton temps.
              Le pseudo est affiché publiquement ; le classement est remis à zéro chaque semaine et les données sont supprimées après
              8 semaines. Pour limiter les abus, une empreinte anonymisée de ta connexion est conservée une heure. N&apos;utilise pas
              ton vrai nom si tu ne le souhaites pas.
            </p>
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

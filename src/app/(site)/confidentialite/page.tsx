import type { Metadata } from "next";
import { LEGAL } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/confidentialite" } };

// GABARIT — à compléter et à faire relire.
export default function PrivacyPage() {
  return (
    <div className="container">
      <header className="page-head">
        <Breadcrumb items={[{ label: "Confidentialité" }]} />
        <h1>Politique de confidentialité</h1>
        <p>Dernière mise à jour : {LEGAL.updatedAt}</p>
      </header>
      <div className="prose">
        <h2>Responsable du traitement</h2>
        <p>{LEGAL.owner} EI (« {LEGAL.tradeName} »), {LEGAL.address} — <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></p>
        <h2>Données collectées</h2>
        <ul>
          <li>Lors d&apos;un achat : adresse email, pays de facturation, contenu et montant de la commande.</li>
          <li>Les données bancaires sont traitées exclusivement par Stripe : nous n&apos;y avons jamais accès.</li>
        </ul>
        <h2>Finalités et bases légales</h2>
        <ul>
          <li>Exécution de la commande et envoi des fichiers (exécution du contrat).</li>
          <li>Comptabilité et facturation (obligation légale).</li>
        </ul>
        <h2>Durées de conservation</h2>
        <ul>
          <li>Données de commande : 10 ans (obligations comptables).</li>
          <li>Journaux techniques du site : quelques jours (hébergeur).</li>
        </ul>
        <h2>Sous-traitants</h2>
        <ul>
          <li>Cloudflare (hébergement, stockage des fichiers).</li>
          <li>Stripe (paiement et historique des commandes).</li>
          <li>Resend (envoi des emails de commande).</li>
        </ul>
        <p>
          Certains de ces prestataires sont établis aux États-Unis ; les transferts sont encadrés par le Data Privacy Framework
          et/ou des clauses contractuelles types de la Commission européenne.
        </p>
        <h2>Cookies</h2>
        <p>
          Le site n&apos;utilise que des éléments strictement nécessaires à son fonctionnement (sécurité du paiement). Aucun cookie publicitaire ou de mesure d&apos;audience n&apos;est déposé.
        </p>
        <h2>Tes droits</h2>
        <p>
          Tu disposes d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de limitation et d&apos;opposition. Pour
          les exercer : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Tu peux aussi adresser une réclamation à la CNIL (www.cnil.fr).
        </p>
      </div>
    </div>
  );
}

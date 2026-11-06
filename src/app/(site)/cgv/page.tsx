import type { Metadata } from "next";
import { LEGAL } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const metadata: Metadata = { title: "Conditions générales de vente", alternates: { canonical: "/cgv" } };

// GABARIT — structure conforme aux obligations de la vente en ligne de contenus
// numériques. À compléter et à faire relire par un professionnel avant la mise en ligne.
export default function CgvPage() {
  return (
    <div className="container">
      <header className="page-head">
        <Breadcrumb items={[{ label: "CGV" }]} />
        <h1>Conditions générales de vente</h1>
        <p>Dernière mise à jour : {LEGAL.updatedAt}</p>
      </header>
      <div className="prose">
        <h2>1. Objet</h2>
        <p>
          Les présentes conditions régissent la vente de contenus numériques (fichiers PDF) proposés sur lapetiteide.fr par{" "}
          {LEGAL.owner} EI (« {LEGAL.tradeName} »), {LEGAL.address}, SIRET {LEGAL.siret}.
        </p>
        <h2>2. Produits</h2>
        <p>
          Les produits sont des fichiers PDF à usage strictement personnel. Leurs caractéristiques essentielles (contenu, nombre de
          pages, format) sont décrites sur chaque fiche produit.
        </p>
        <h2>3. Prix</h2>
        <p>
          Les prix sont indiqués en euros, {LEGAL.vat}. Le prix applicable est
          celui affiché au moment de la validation de la commande.
        </p>
        <h2>4. Commande et paiement</h2>
        <p>
          La commande est validée après acceptation des présentes CGV et paiement intégral par carte bancaire, Apple Pay ou Google
          Pay via le prestataire sécurisé Stripe. La commande est confirmée par email.
        </p>
        <h2>5. Livraison</h2>
        <p>
          Les fichiers sont accessibles immédiatement après confirmation du paiement, sur la page de confirmation et par email,
          via un lien de téléchargement personnel valable 30 jours à compter de l&apos;achat. Il appartient au client
          d&apos;enregistrer les fichiers sur son appareil.
        </p>
        <h2>6. Droit de rétractation</h2>
        <p>
          Conformément à l&apos;article L221-28 13° du Code de la consommation, le droit de rétractation ne peut être exercé pour
          la fourniture d&apos;un contenu numérique non fourni sur un support matériel dont l&apos;exécution a commencé après
          accord préalable exprès du consommateur et renoncement exprès à son droit de rétractation. En cochant la case prévue
          sur la page de paiement, le client demande l&apos;accès immédiat aux fichiers et reconnaît perdre son droit de rétractation.
        </p>
        <h2>7. Licence d&apos;utilisation</h2>
        <p>
          L&apos;achat confère une licence d&apos;utilisation personnelle et non transférable. Toute reproduction, diffusion,
          partage ou revente est interdite.
        </p>
        <h2>8. Garanties et réclamations</h2>
        <p>
          En cas de fichier défectueux ou inaccessible, le client peut contacter <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Le client bénéficie de la
          garantie légale de conformité des contenus numériques (articles L224-25-12 et suivants du Code de la consommation).
        </p>
        <h2>9. Données personnelles</h2>
        <p>Voir la politique de confidentialité.</p>
        <h2>10. Médiation et litiges</h2>
        <p>
          En cas de réclamation, le client est invité à contacter en priorité {LEGAL.email} afin de trouver une solution
          amiable. Les présentes CGV sont soumises au droit français.
        </p>
      </div>
    </div>
  );
}

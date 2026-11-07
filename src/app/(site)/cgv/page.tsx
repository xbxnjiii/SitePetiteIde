import type { Metadata } from "next";
import Link from "next/link";
import { InfoList, LegalPage } from "@/components/content/LegalPage";
import { LEGAL, SITE } from "@/lib/format";

export const metadata: Metadata = { title: "Conditions générales de vente", alternates: { canonical: "/cgv" } };

const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;

export default function CgvPage() {
  return (
    <LegalPage
      title="Conditions générales de vente"
      intro="Elles s'appliquent à tout achat de fiches PDF sur lapetiteide.fr."
      updatedAt={LEGAL.updatedAt}
      toc
      sections={[
        {
          id: "vendeur",
          title: "Vendeur",
          content: (
            <InfoList
              items={[
                ["Vendeur", `${LEGAL.owner} EI — « ${LEGAL.tradeName} »`],
                ["Adresse", LEGAL.address],
                ["SIRET", LEGAL.siret],
                ["Email", mail],
                ["Téléphone", <a key="t" href={`tel:${LEGAL.phoneHref}`}>{LEGAL.phone}</a>],
              ]}
            />
          ),
        },
        {
          id: "produits",
          title: "Produits",
          content: (
            <p>
              Les produits sont des fiches numériques, fournies en PDF et en images, à usage strictement personnel. Leurs caractéristiques essentielles (contenu, format)
              sont décrites sur chaque page de vente. Les mises à jour ultérieures des fiches achetées sont fournies
              gratuitement au client.
            </p>
          ),
        },
        {
          id: "prix",
          title: "Prix",
          content: <p>Les prix sont indiqués en euros. {LEGAL.vat}. Le prix applicable est celui affiché au moment de la commande.</p>,
        },
        {
          id: "commande",
          title: "Commande et paiement",
          content: (
            <p>
              La commande est validée après acceptation des présentes CGV et paiement intégral par carte bancaire, Apple Pay ou Google
              Pay, via le prestataire sécurisé Stripe. Nous n&apos;avons jamais accès aux données bancaires. La commande est confirmée
              par email.
            </p>
          ),
        },
        {
          id: "livraison",
          title: "Livraison",
          content: (
            <p>
              Les fichiers sont accessibles immédiatement après confirmation du paiement, sur la page de confirmation et par email, via
              un lien de téléchargement personnel valable {SITE.downloadDays} jours. De nouveaux liens peuvent être obtenus à tout moment
              depuis la page « <Link href="/retrouver-mon-achat">Retrouver mon achat</Link> ». Il appartient au client d&apos;enregistrer
              les fichiers sur son appareil.
            </p>
          ),
        },
        {
          id: "retractation",
          title: "Droit de rétractation",
          content: (
            <p>
              Conformément à l&apos;article L221-28 13° du Code de la consommation, le droit de rétractation ne peut être exercé pour
              un contenu numérique fourni immédiatement, après accord préalable exprès du client et renoncement exprès à ce droit. En
              cochant la case prévue avant le paiement, le client demande l&apos;accès immédiat aux fichiers et reconnaît perdre son
              droit de rétractation.
            </p>
          ),
        },
        {
          id: "licence",
          title: "Licence d'utilisation",
          content: (
            <p>
              L&apos;achat confère une licence d&apos;utilisation personnelle et non transférable. Toute reproduction, diffusion,
              partage ou revente est interdite.
            </p>
          ),
        },
        {
          id: "garanties",
          title: "Garanties et réclamations",
          content: (
            <p>
              En cas de fichier défectueux ou inaccessible, écris-nous à {mail}. Le client bénéficie de la garantie légale de
              conformité des contenus numériques (articles L224-25-12 et suivants du Code de la consommation).
            </p>
          ),
        },
        {
          id: "donnees",
          title: "Données personnelles",
          content: (
            <p>
              Voir la <Link href="/confidentialite">politique de confidentialité</Link>.
            </p>
          ),
        },
        {
          id: "litiges",
          title: "Litiges et droit applicable",
          content: (
            <p>
              En cas de réclamation, contacte-nous en priorité à {mail} afin de trouver une solution amiable. Les présentes CGV sont
              soumises au droit français.
            </p>
          ),
        },
      ]}
    />
  );
}

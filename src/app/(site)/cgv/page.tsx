import type { Metadata } from "next";
import Link from "next/link";
import { InfoList, LegalPage } from "@/components/content/LegalPage";
import { SHIPPING } from "@/content/shipping";
import { LEGAL, SITE, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Conditions générales de vente", alternates: { canonical: "/cgv" } };

const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;

export default function CgvPage() {
  return (
    <LegalPage
      title="Conditions générales de vente"
      intro="Elles s'appliquent à tout achat de fiches numériques (PDF et images) ou papier sur lapetiteide.fr."
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
            <>
              <p>
                Les packs sont proposés en deux formats : des fiches numériques (PDF et images) à usage strictement personnel, ou des fiches imprimées
                (« format papier ») livrées à domicile, accompagnées de la version numérique offerte. Leurs caractéristiques essentielles (contenu, format,
                finition) sont décrites sur chaque page de vente.
              </p>
              <p>
                Les mises à jour ultérieures des fiches numériques achetées ou offertes sont fournies gratuitement au client. Les fiches papier
                correspondent à la version en vigueur au moment de l&apos;expédition et ne font pas l&apos;objet d&apos;une
                réimpression lors des mises à jour.
              </p>
            </>
          ),
        },
        {
          id: "prix",
          title: "Prix",
          content: (
            <p>
              Les prix sont indiqués en euros. {LEGAL.vat}. Le prix applicable est celui affiché au moment de la commande. Pour le format
              papier, des frais de livraison de {formatPrice(SHIPPING.priceCents)} s&apos;ajoutent ; ils sont indiqués avant le
              paiement.
            </p>
          ),
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
            <>
              <p>
                <strong>Numérique.</strong> Les fiches sont accessibles immédiatement après confirmation du paiement, en PDF et en images, sur la page de
                confirmation et par email, via des liens personnels valables {SITE.downloadDays} jours. De nouveaux liens
                peuvent être obtenus à tout moment depuis la page « <Link href="/retrouver-mon-achat">Retrouver mon achat</Link> ». Il
                appartient au client d&apos;enregistrer les fichiers sur son appareil.
              </p>
              <p>
                <strong>Papier.</strong> Livraison en {SHIPPING.zone} uniquement, à l&apos;adresse indiquée lors du paiement, par{" "}
                {SHIPPING.name} ({formatPrice(SHIPPING.priceCents)}). {SHIPPING.dispatch} après confirmation du paiement ; délai de
                livraison indicatif de {SHIPPING.estimate.min} à {SHIPPING.estimate.max} jours ouvrés après l&apos;expédition. Un
                numéro de suivi est envoyé par email. En cas de retard important, de colis perdu ou endommagé, écris-nous à {mail} :
                les fiches sont renvoyées ou remboursées. La version numérique offerte est envoyée immédiatement, comme pour un achat numérique.
              </p>
            </>
          ),
        },
        {
          id: "retractation",
          title: "Droit de rétractation",
          content: (
            <>
              <p>
                <strong>Numérique.</strong> Conformément à l&apos;article L221-28 13° du Code de la consommation, le droit de rétractation ne
                peut être exercé pour un contenu numérique fourni immédiatement, après accord préalable exprès du client et
                renoncement exprès à ce droit. En cochant la case prévue avant le paiement, le client demande l&apos;accès immédiat
                aux fichiers et reconnaît perdre son droit de rétractation.
              </p>
              <p>
                <strong>Papier.</strong> Le client dispose de 14 jours à compter de la réception des fiches pour exercer son droit de
                rétractation, sans avoir à se justifier (articles L221-18 et suivants du Code de la consommation). Il suffit de nous
                l&apos;indiquer par email à {mail}, ou d&apos;utiliser le{" "}
                <a href="#formulaire-retractation">formulaire de rétractation</a> ci-dessous. Les fiches sont à renvoyer dans les 14
                jours suivant cette demande, en bon état ; les frais de retour sont à la charge du client. Le remboursement, frais de
                livraison initiaux compris, intervient dans les 14 jours suivant la demande, et au plus tard à réception des fiches
                retournées. La version numérique offerte reste acquise au client.
              </p>
            </>
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
              En cas de fichier défectueux ou inaccessible, ou de fiches papier abîmées ou non conformes, écris-nous à {mail}. Le client
              bénéficie de la garantie légale de conformité des contenus numériques (articles L224-25-12 et suivants du Code de la
              consommation) et, pour les fiches papier, de la garantie légale de conformité des biens pendant 2 ans à compter de la
              livraison (articles L217-3 et suivants) ainsi que de la garantie des vices cachés (articles 1641 et suivants du Code
              civil).
            </p>
          ),
        },
        {
          id: "formulaire-retractation",
          title: "Formulaire de rétractation (fiches papier)",
          content: (
            <p>
              À l&apos;attention de {LEGAL.owner} EI — « {LEGAL.tradeName} », {LEGAL.address}, {LEGAL.email} :<br />
              Je vous notifie par la présente ma rétractation du contrat portant sur la vente des fiches papier ci-dessous :<br />
              Référence de commande : …<br />
              Commandé le : … / Reçu le : …<br />
              Nom du client : …<br />
              Adresse du client : …<br />
              Date et signature (si envoi papier) : …
            </p>
          ),
        },
        {
          id: "soutien",
          title: "Soutien volontaire",
          content: (
            <p>
              Le site permet de verser un soutien facultatif (1, 2 ou 5 €) à {LEGAL.tradeName}. Ce paiement volontaire ne donne
              droit à aucun produit ni avantage et n&apos;ouvre pas droit à une réduction d&apos;impôt (il ne s&apos;agit pas d&apos;un
              don à une association).
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

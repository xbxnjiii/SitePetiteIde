import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SHIPPING } from "@/content/shipping";
import { formatPrice } from "@/lib/format";
import { jsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Questions fréquentes",
  description: "Paiement, téléchargement, livraison, formats, rétractation : toutes les réponses à tes questions sur La Petite IDE.",
  alternates: { canonical: "/faq" },
};

const FAQ = [
  {
    q: "Comment je reçois mes fichiers ?",
    a: "Dès que ton paiement est validé, tes PDF sont disponibles au téléchargement sur la page de confirmation. Tu reçois aussi un email avec tes liens de téléchargement.",
  },
  {
    q: "Je n'ai pas reçu l'email, que faire ?",
    a: "Vérifie tes spams et ton dossier « Promotions ». Sinon, rends-toi sur la page « Retrouver mon achat » : indique ton email et tes liens te sont renvoyés.",
  },
  {
    q: "Combien de temps mon lien est-il valable ?",
    a: "Ton lien personnel est valable 30 jours après l'achat. Pense à enregistrer le PDF sur ton téléphone ou ton ordinateur.",
  },
  {
    q: "Dois-je créer un compte ?",
    a: "Non. Il suffit de ton adresse email au moment du paiement : c'est elle qui reçoit tes liens de téléchargement.",
  },
  {
    q: "Sur quels appareils puis-je lire les fiches ?",
    a: "Les fichiers sont au format PDF : ils se lisent sur téléphone, tablette et ordinateur, et peuvent être imprimés.",
  },
  {
    q: "Mon téléchargement ne marche pas depuis TikTok ou Instagram",
    a: "Les navigateurs intégrés aux applications bloquent parfois les téléchargements. Ouvre la page dans Safari ou Chrome (menu « … » puis « Ouvrir dans le navigateur »), ou utilise le lien reçu par email.",
  },
  {
    q: "Les fiches existent-elles en papier ?",
    a: `Oui, pour les packs qui l'indiquent : tu choisis « Papier + PDF offert » sur la page du pack. Les fiches sont livrées chez toi en ${SHIPPING.zone}, et tu reçois le PDF tout de suite.`,
  },
  {
    q: "Combien coûte la livraison et en combien de temps ?",
    a: `${formatPrice(SHIPPING.priceCents)} par commande, par ${SHIPPING.name}. ${SHIPPING.dispatch}, puis compte ${SHIPPING.estimate.min} à ${SHIPPING.estimate.max} jours ouvrés. Tu reçois le numéro de suivi par email.`,
  },
  {
    q: "Livrez-vous à l'étranger ou en outre-mer ?",
    a: "Pas encore : la livraison est possible en France métropolitaine (Corse comprise) uniquement. Le PDF, lui, est disponible partout.",
  },
  {
    q: "Quels moyens de paiement acceptez-vous ?",
    a: "Carte bancaire, Apple Pay ou Google Pay, via notre prestataire sécurisé Stripe. Nous n'avons jamais accès à tes données bancaires.",
  },
  {
    q: "Puis-je être remboursé·e ?",
    a: "Pour le PDF : s'agissant d'un contenu numérique fourni immédiatement, tu renonces à ton droit de rétractation lorsque tu demandes l'accès immédiat aux fichiers. Pour les fiches papier : tu as 14 jours après réception pour changer d'avis (voir les CGV). Dans tous les cas, en cas de problème, contacte-nous : on trouvera une solution.",
  },
  {
    q: "Puis-je partager mes fiches ?",
    a: "Les fichiers sont réservés à un usage personnel. Merci de ne pas les partager ni les revendre : c'est ce qui nous permet de continuer à créer de nouveaux contenus.",
  },
];

export default function FaqPage() {
  const structured = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <div className="container">
      <header className="page-head">
        <Breadcrumb items={[{ label: "FAQ" }]} />
        <h1>Questions fréquentes</h1>
      </header>
      <div className="prose">
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
        <p style={{ marginTop: 24 }}>
          Tu ne trouves pas ta réponse ? <Link href="/contact">Contacte-nous</Link>.
        </p>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </div>
  );
}

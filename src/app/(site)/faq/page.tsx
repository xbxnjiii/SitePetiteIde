import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { jsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Questions fréquentes",
  description: "Paiement, téléchargement, formats, rétractation : toutes les réponses à tes questions sur La Petite IDE.",
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
    q: "Quels moyens de paiement acceptez-vous ?",
    a: "Carte bancaire, Apple Pay ou Google Pay, via notre prestataire sécurisé Stripe. Nous n'avons jamais accès à tes données bancaires.",
  },
  {
    q: "Puis-je être remboursé·e ?",
    a: "S'agissant de contenus numériques fournis immédiatement, tu renonces à ton droit de rétractation lorsque tu demandes l'accès immédiat aux fichiers lors de la commande. En cas de problème avec un fichier, contacte-nous : on trouvera une solution.",
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

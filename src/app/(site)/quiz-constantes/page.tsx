import type { Metadata } from "next";
import { Quiz } from "@/components/shop/Quiz";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const metadata: Metadata = {
  title: "Quiz gratuit : teste-toi sur les constantes",
  description: "10 questions pour vérifier tes connaissances sur les constantes (FC, FR, température, TA, SpO2, glycémie, diurèse). Gratuit.",
  alternates: { canonical: "/quiz-constantes" },
  openGraph: { title: "Quiz : teste-toi sur les constantes", images: [{ url: "/img/packs/pack-constantes-v2-og.jpg", width: 1200, height: 630 }] },
};

export default function QuizPage() {
  return (
    <div className="container legal">
      <header className="legal__head contact__head">
        <Breadcrumb items={[{ label: "Quiz des constantes" }]} />
        <h1>Teste-toi sur les constantes 🧠</h1>
        <p className="legal__intro">10 questions, 2 minutes. Combien de bonnes réponses vas-tu avoir ?</p>
      </header>
      <Quiz />
      <p className="contact__tip">
        Valeurs de référence chez l&apos;adulte, à titre de révision : suis toujours les protocoles de ton service.
      </p>
    </div>
  );
}

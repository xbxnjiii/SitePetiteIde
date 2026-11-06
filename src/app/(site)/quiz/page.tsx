import type { Metadata } from "next";
import { quizzes } from "@/content/quiz";
import { ModePicker } from "@/components/shop/Quiz";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Quiz gratuits pour étudiants infirmiers",
  description: "Teste tes connaissances en 2 minutes : constantes, et bientôt pathologies, arrêt cardiaque, diabète…",
  alternates: { canonical: "/quiz" },
};

// Page de choix du thème : chaque thème disponible ouvre son quiz.
export default function QuizHubPage() {
  return (
    <div className="container legal">
      <header className="legal__head contact__head">
        <Breadcrumb items={[{ label: "Quiz" }]} />
        <h1>Teste tes connaissances 🧠</h1>
        <p className="legal__intro">Choisis ton thème et ton format : Flash Quiz en 2 min, ou le Quiz des Pros.</p>
      </header>
      <ul className="quiz-themes">
        {quizzes.map((t) => (
          <li key={t.slug}>
            {t.status === "available" ? (
              <div className="quiz-theme quiz-theme--open">
                <div className="quiz-theme__row">
                  <span className="quiz-theme__icon"><Icon name={t.icon} /></span>
                  <span className="quiz-theme__text">
                    <strong>{t.title}</strong>
                    <span>{t.description}</span>
                  </span>
                </div>
                <ModePicker themeSlug={t.slug} />
              </div>
            ) : (
              <div className="quiz-theme quiz-theme--soon" aria-disabled="true">
                <span className="quiz-theme__icon"><Icon name={t.icon} /></span>
                <span className="quiz-theme__text">
                  <strong>{t.title}</strong>
                  <span>{t.description}</span>
                </span>
                <span className="quiz-theme__soon">Bientôt</span>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="contact__tip">À titre de révision : suis toujours les protocoles de ton service.</p>
    </div>
  );
}

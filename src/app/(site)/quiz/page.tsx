import type { Metadata } from "next";
import { quizzes } from "@/content/quiz";
import { ModePicker } from "@/components/shop/Quiz";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const metadata: Metadata = {
  title: "Quiz gratuits pour étudiants infirmiers",
  description: "Teste tes connaissances en 2 minutes : constantes, et bientôt pathologies, arrêt cardiaque, diabète…",
  alternates: { canonical: "/quiz" },
};

// Page des thèmes : chaque thème disponible propose ses deux formats ; les suivants sont annoncés.
export default function QuizHubPage() {
  const available = quizzes.filter((q) => q.status === "available");
  const soon = quizzes.filter((q) => q.status === "soon");
  return (
    <div className="container qz-page">
      <header className="qz-head">
        <Breadcrumb items={[{ label: "Quiz" }]} />
        <h1>Quiz 🧠</h1>
        <p>Choisis ton thème, lance-toi, partage ton score.</p>
      </header>

      {available.map((t) => (
        <section key={t.slug} className="qz-theme" aria-labelledby={`t-${t.slug}`}>
          <h2 id={`t-${t.slug}`}>
            <span aria-hidden="true">{t.emoji}</span> {t.title}
          </h2>
          <ModePicker themeSlug={t.slug} />
        </section>
      ))}

      {soon.length ? (
        <section className="qz-soon" aria-label="Thèmes à venir">
          <p>Bientôt</p>
          <div>
            {soon.map((t) => (
              <span key={t.slug}>
                <span aria-hidden="true">{t.emoji}</span> {t.title}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

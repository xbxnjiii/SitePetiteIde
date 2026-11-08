import type { Metadata } from "next";
import Link from "next/link";
import { QUIZ_MODES, quizzes } from "@/content/quiz";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const metadata: Metadata = {
  title: "Quiz gratuits pour étudiants infirmiers",
  description: "Teste tes connaissances en 2 minutes : constantes, arrêt cardiaque, embolie pulmonaire, AVC, BPCO…",
  alternates: { canonical: "/quiz" },
};

// Liste compacte des thèmes : une ligne par thème avec ses deux formats (lisible même avec beaucoup de thèmes).
export default function QuizHubPage() {
  const sorted = quizzes.filter((q) => q.status === "available");
  return (
    <div className="container qz-page">
      <header className="qz-head">
        <Breadcrumb items={[{ label: "Quiz" }]} />
        <h1>Quiz 🧠</h1>
        <p>
          ⚡ Flash : {QUIZ_MODES.flash.count} questions · 🏆 Pros : jusqu&apos;à {QUIZ_MODES.pros.count} questions
        </p>
      </header>

      <ul className="qz-list">
        {sorted.map((t) => {
          const soon = t.status !== "available";
          return (
            <li key={t.slug} className={soon ? "qz-row qz-row--soon" : "qz-row"}>
              <span className="qz-row__emoji" aria-hidden="true">
                {t.emoji}
              </span>
              <span className="qz-row__text">
                <strong>{t.title}</strong>
                <span>{t.description}</span>
              </span>
              {soon ? (
                <span className="qz-row__soon">Bientôt</span>
              ) : (
                <span className="qz-row__modes">
                  <Link href={`/quiz/${t.slug}?mode=flash`} className="qz-pill qz-pill--flash" aria-label={`${t.title} : Flash Quiz`}>
                    ⚡ Flash
                  </Link>
                  <Link href={`/quiz/${t.slug}?mode=pros`} className="qz-pill qz-pill--pros" aria-label={`${t.title} : Quiz des Pros`}>
                    🏆 Pros
                  </Link>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="qz-more">🛠️ D&apos;autres quiz sont en cours de préparation…</p>
    </div>
  );
}

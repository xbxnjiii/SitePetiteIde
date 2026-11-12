import type { Metadata } from "next";
import { QUIZ_MODES, quizzes } from "@/content/quiz";
import { QuizCarousel } from "@/components/shop/QuizCarousel";

export const metadata: Metadata = {
  title: "Quiz gratuits pour étudiants infirmiers",
  description: "Teste tes connaissances en 2 minutes : constantes, arrêt cardiaque, embolie pulmonaire, AVC, BPCO…",
  alternates: { canonical: "/quiz" },
};

// Page de tous les quiz : carrousel immersif, une grande carte par thème avec ses deux formats (Flash / Pros).
export default function QuizHubPage() {
  const slides = quizzes
    .filter((q) => q.status === "available")
    .map((q) => ({ slug: q.slug, emoji: q.emoji, title: q.title, description: q.description, total: q.questions.length }));
  return (
    <div className="qzc-page">
      <header className="qzc-head container">
        <h1>Quiz 🧠</h1>
        <p>Choisis un thème, puis ton format</p>
      </header>
      <QuizCarousel
        slides={slides}
        flash={{ label: QUIZ_MODES.flash.label, count: QUIZ_MODES.flash.count, duration: QUIZ_MODES.flash.duration }}
        pros={{ label: QUIZ_MODES.pros.label, count: QUIZ_MODES.pros.count, duration: QUIZ_MODES.pros.duration }}
      />
      <p className="qzc-more container">🛠️ D&apos;autres quiz arrivent bientôt</p>
    </div>
  );
}

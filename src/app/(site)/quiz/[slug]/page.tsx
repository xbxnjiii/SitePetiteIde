import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QUIZ_MODES, getQuiz, quizzes } from "@/content/quiz";
import { Quiz } from "@/components/shop/Quiz";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return quizzes.filter((q) => q.status === "available").map((q) => ({ slug: q.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const theme = getQuiz((await params).slug);
  if (!theme) return {};
  return {
    title: `Quiz gratuit : ${theme.title.toLowerCase()}`,
    description: `Flash Quiz (${QUIZ_MODES.flash.count} questions) ou Quiz des Pros (${QUIZ_MODES.pros.count} questions) : ${theme.description}. Gratuit.`,
    alternates: { canonical: `/quiz/${theme.slug}` },
  };
}

export default async function QuizThemePage({ params }: { params: Params }) {
  const theme = getQuiz((await params).slug);
  if (!theme) notFound();
  return (
    <div className="container legal">
      <header className="legal__head contact__head">
        <Breadcrumb items={[{ label: "Quiz", href: "/quiz" }, { label: theme.title }]} />
        <h1>Quiz : {theme.title.toLowerCase()} 🧠</h1>
        <p className="legal__intro">Flash Quiz pour réviser en 2 min, ou Quiz des Pros pour viser le sans-faute.</p>
      </header>
      <Quiz theme={theme} />
      <p className="contact__tip">
        Valeurs de référence chez l&apos;adulte, à titre de révision : suis toujours les protocoles de ton service.
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QUIZ_MODES, getQuiz, quizzes } from "@/content/quiz";
import { Quiz } from "@/components/shop/Quiz";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getEnvAsync } from "@/lib/env";
import { getSettings } from "@/lib/settings";

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;
// Rendu à chaque visite : le formulaire email de fin de quiz s'active depuis /admin (Réglages).
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return quizzes.filter((q) => q.status === "available").map((q) => ({ slug: q.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const theme = getQuiz((await params).slug);
  if (!theme) return {};
  return {
    title: `Quiz gratuit : ${theme.title.toLowerCase()}`,
    description: `Flash Quiz (${QUIZ_MODES.flash.count} questions) ou Quiz des Pros (${Math.min(QUIZ_MODES.pros.count, theme.questions.length)} questions) : ${theme.description}. Gratuit.`,
    alternates: { canonical: `/quiz/${theme.slug}` },
  };
}

export default async function QuizThemePage({ params }: { params: Params }) {
  const theme = getQuiz((await params).slug);
  if (!theme) notFound();
  const { quizEmails } = await getSettings(await getEnvAsync());
  return (
    <div className="container qz-page">
      <header className="qz-head">
        <Breadcrumb items={[{ label: "Quiz", href: "/quiz" }, { label: theme.title }]} />
        <h1>
          <span aria-hidden="true">{theme.emoji}</span> {theme.title}
        </h1>
      </header>
      <Quiz theme={theme} emailCapture={quizEmails} />
      <p className="qz-disclaimer">Contenu de révision (adulte) : suis toujours les protocoles de ton service.</p>
    </div>
  );
}

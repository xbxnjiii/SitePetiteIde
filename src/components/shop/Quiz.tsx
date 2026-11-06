"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Mascot } from "@/components/ui/Mascot";
import { QUIZ_MODES, type QuizMode, type QuizQuestion, type QuizTheme, quizVerdict } from "@/content/quiz";

/** Tire `n` questions au hasard (mélange de Fisher-Yates). */
function draw(all: QuizQuestion[], n: number): QuizQuestion[] {
  const a = [...all];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(n, a.length));
}

const isMode = (v: unknown): v is QuizMode => v === "flash" || v === "pros";

/** Choix entre « Flash Quiz » et « Le Quiz des Pros ». */
export function ModePicker({ onPick, themeSlug, current }: { onPick?: (m: QuizMode) => void; themeSlug?: string; current?: QuizMode }) {
  return (
    <div className="quiz-modes">
      {(Object.keys(QUIZ_MODES) as QuizMode[]).map((m) => {
        const mode = QUIZ_MODES[m];
        const content = (
          <>
            <span className={`quiz-mode__badge quiz-mode__badge--${m}`}>{m === "flash" ? "⚡" : "🏆"}</span>
            <span className="quiz-mode__text">
              <strong>{mode.label}</strong>
              <span>
                {mode.count} questions · {mode.duration}
              </span>
              <em>{mode.tagline}</em>
            </span>
            <Icon name="arrow" />
          </>
        );
        const cls = `quiz-mode quiz-mode--${m}${current === m ? " quiz-mode--current" : ""}`;
        return onPick ? (
          <button key={m} type="button" className={cls} onClick={() => onPick(m)}>
            {content}
          </button>
        ) : (
          <Link key={m} href={`/quiz/${themeSlug}?mode=${m}`} className={cls}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}

export function Quiz({ theme }: { theme: QuizTheme }) {
  const [mode, setMode] = useState<QuizMode | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const start = (m: QuizMode) => {
    // Tirage côté navigateur uniquement (évite un écart entre le rendu serveur et le navigateur).
    setMode(m);
    setQuestions(draw(theme.questions, QUIZ_MODES[m].count));
    setIndex(0);
    setPicked(null);
    setScore(0);
    setDone(false);
    setCopied(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Format demandé dans l'adresse (?mode=flash / ?mode=pros), depuis la page des thèmes.
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("mode");
    if (isMode(m)) start(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mode || questions.length === 0) {
    return (
      <div className="quiz quiz--start">
        <h2>Choisis ton format</h2>
        <ModePicker onPick={start} />
      </div>
    );
  }

  const total = questions.length;
  const q = questions[index];
  const label = QUIZ_MODES[mode].label;

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (index + 1 >= total) setDone(true);
    else {
      setIndex(index + 1);
      setPicked(null);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/quiz/${theme.slug}?mode=${mode}`;
    const text = `J'ai eu ${score}/${total} au ${label} « ${theme.title} » de La Petite IDE. Et toi ? 👀`;
    try {
      if (navigator.share) await navigator.share({ title: `${label} : ${theme.title}`, text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
      }
    } catch {
      // partage annulé : rien à faire
    }
  };

  if (done) {
    const verdict = quizVerdict(score, total);
    return (
      <div className="quiz quiz--end">
        <Mascot pose={score / total >= 0.7 ? "bravo" : "lecture"} className="quiz__mascot" />
        <p className="quiz__mode-label">{label}</p>
        <p className="quiz__score">
          {score}
          <span>/{total}</span>
        </p>
        <h2>{verdict.title}</h2>
        <p className="quiz__verdict">{verdict.text}</p>
        {theme.packSlug ? (
          <Link href={`/${theme.packSlug}?src=quiz`} className="btn btn--primary btn--block btn--buy">
            Découvrir le {theme.packName}
          </Link>
        ) : null}
        <button type="button" className="btn btn--secondary btn--sm quiz__share" onClick={share}>
          {copied ? "Lien copié ✓" : "Défier une amie"}
        </button>
        <div className="quiz__replay">
          <p>Rejouer :</p>
          <ModePicker onPick={start} current={mode} />
          <Link href="/quiz" className="quiz__other">
            Autres thèmes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz">
      <div className="quiz__progress" aria-hidden="true">
        <span style={{ width: `${((index + (picked !== null ? 1 : 0)) / total) * 100}%` }} />
      </div>
      <p className="quiz__count">
        {label} · Question {index + 1} / {total}
      </p>
      <h2 className="quiz__question">{q.question}</h2>
      <div className="quiz__choices" role="group" aria-label="Réponses">
        {q.choices.map((c, i) => {
          const state =
            picked === null ? "" : i === q.answer ? " quiz__choice--good" : i === picked ? " quiz__choice--bad" : " quiz__choice--off";
          return (
            <button key={c} type="button" className={`quiz__choice${state}`} onClick={() => choose(i)} disabled={picked !== null}>
              <span>{c}</span>
              {picked !== null && i === q.answer ? <Icon name="check" /> : null}
              {picked !== null && i === picked && i !== q.answer ? <Icon name="close" /> : null}
            </button>
          );
        })}
      </div>
      {picked !== null ? (
        <div className="quiz__feedback" role="status">
          <p>
            <strong>{picked === q.answer ? "Bonne réponse !" : "Pas tout à fait…"}</strong> {q.explanation}
          </p>
          <button type="button" className="btn btn--primary btn--block" onClick={next}>
            {index + 1 >= total ? "Voir mon score" : "Question suivante"} <Icon name="arrow" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

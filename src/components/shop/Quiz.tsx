"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Mascot } from "@/components/ui/Mascot";
import { QUIZ_PACK_SLUG, quiz, quizVerdict } from "@/content/quiz";

export function Quiz() {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const total = quiz.length;
  const q = quiz[index];

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

  const restart = () => {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  const share = async () => {
    const url = `${window.location.origin}/quiz-constantes`;
    const text = `J'ai eu ${score}/${total} au quiz des constantes de La Petite IDE. Et toi ? 👀`;
    try {
      if (navigator.share) await navigator.share({ title: "Quiz des constantes", text, url });
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
        <p className="quiz__score">
          {score}
          <span>/{total}</span>
        </p>
        <h2>{verdict.title}</h2>
        <p className="quiz__verdict">{verdict.text}</p>
        <Link href={`/${QUIZ_PACK_SLUG}?src=quiz`} className="btn btn--primary btn--block btn--buy">
          Découvrir le Pack Mémos : Constantes
        </Link>
        <div className="quiz__actions">
          <button type="button" className="btn btn--secondary btn--sm" onClick={share}>
            {copied ? "Lien copié ✓" : "Défier une amie"}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={restart}>
            Recommencer
          </button>
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
        Question {index + 1} / {total}
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

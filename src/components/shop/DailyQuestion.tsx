"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { dayKey, recordDaily, useProgress } from "@/lib/progress";
import { sfx } from "@/lib/sounds";
import { QuizArt, type QuizArtName } from "./QuizArt";

interface Daily {
  theme: string;
  slug: string;
  icon: QuizArtName;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
}

/** Fenêtre « Question du jour » : une question, une réponse par jour, des points et la série de jours. */
export function DailyQuestionModal({ onClose }: { onClose: () => void }) {
  const progress = useProgress();
  const [data, setData] = useState<Daily | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [xp, setXp] = useState(0);
  const already = progress?.daily.last === dayKey() && picked === null;

  useEffect(() => {
    fetch("/api/question-du-jour")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setData(d as Daily))
      .catch(() => setFailed(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const choose = (i: number) => {
    if (!data || picked !== null || already) return;
    const ok = i === data.answer;
    setPicked(i);
    setXp(recordDaily(ok).xp);
    if (ok) sfx.good();
    else sfx.bad();
  };

  const shown = already ? data?.answer ?? null : picked;
  const answered = shown !== null && shown !== undefined;
  return (
    <div className="modal" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__panel dq" role="dialog" aria-modal="true" aria-labelledby="dq-title">
        <div className="modal__head">
          <h2 id="dq-title">
            <QuizArt name="calendar" /> Question du jour
          </h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
            <Icon name="close" />
          </button>
        </div>
        {failed ? (
          <p className="dq__note">Impossible de charger la question (hors connexion ?). Réessaie plus tard.</p>
        ) : !data ? (
          <div className="checkout__loading" aria-label="Chargement" />
        ) : (
          <>
            <p className="dq__theme">
              <QuizArt name={data.icon} /> {data.theme}
            </p>
            <p className="dq__q">{data.question}</p>
            <div className="qz-answers">
              {data.choices.map((c, i) => {
                const state = !answered ? "" : i === data.answer ? " qz-answer--ok" : i === picked ? " qz-answer--ko" : " qz-answer--off";
                return (
                  <button key={c} type="button" className={`qz-answer${state}`} onClick={() => choose(i)} disabled={answered}>
                    <span className="qz-answer__letter">{"ABCD"[i]}</span>
                    <span className="qz-answer__text">{c}</span>
                  </button>
                );
              })}
            </div>
            {answered ? (
              <div className="dq__after">
                <p className="dq__exp">{data.explanation}</p>
                <p className="dq__note">
                  {already ? "Déjà répondu aujourd'hui : reviens demain pour une nouvelle question." : `+${xp} points · à demain pour la prochaine !`}
                </p>
                <Link href={`/quiz/${data.slug}?mode=flash`} className="btn btn--primary btn--block">
                  Continuer sur ce thème <Icon name="arrow" />
                </Link>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/** Bouton « Question du jour » (page de liens) : pastille tant que la question du jour n'a pas été faite. */
export function DailyQuestionButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const progress = useProgress();
  const done = progress?.daily.last === dayKey();
  return (
    <>
      <button type="button" className={`dq-btn ${className}`} onClick={() => setOpen(true)}>
        <span className="dq-btn__icon">
          <QuizArt name="calendar" />
        </span>
        <span className="dq-btn__text">
          <strong>Question du jour</strong>
          <span>{done ? "Faite ! Reviens demain" : "10 secondes pour te tester"}</span>
        </span>
        {done ? <QuizArt name="check" className="dq-btn__done" /> : <span className="dq-btn__dot" aria-label="Nouvelle question" />}
      </button>
      {open ? <DailyQuestionModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

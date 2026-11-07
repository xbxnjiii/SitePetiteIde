"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { QUIZ_MODES, TOPICS, type QuizMode, type QuizQuestion, type QuizTheme, type Topic, quizVerdict } from "@/content/quiz";
import { makeScoreCard, shareScoreCard } from "@/lib/score-card";
import { QuizLeaderboard } from "./QuizLeaderboard";

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
const LETTERS = ["A", "B", "C", "D"];
const MODE_EMOJI: Record<QuizMode, string> = { flash: "⚡", pros: "🏆" };
const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, "0")}`;
const buzz = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* non supporté */
  }
};

/** Deux grandes tuiles : Flash Quiz et Quiz des Pros (boutons, ou liens depuis la page des thèmes). */
export function ModePicker({ onPick, themeSlug }: { onPick?: (m: QuizMode) => void; themeSlug?: string }) {
  return (
    <div className="qz-modes">
      {(Object.keys(QUIZ_MODES) as QuizMode[]).map((m) => {
        const mode = QUIZ_MODES[m];
        const content = (
          <>
            <span className="qz-mode__emoji" aria-hidden="true">
              {MODE_EMOJI[m]}
            </span>
            <strong>{mode.label}</strong>
            <span className="qz-mode__meta">
              {mode.count} questions · {mode.duration}
            </span>
            <span className="qz-mode__go">
              Jouer <Icon name="arrow" />
            </span>
          </>
        );
        return onPick ? (
          <button key={m} type="button" className={`qz-mode qz-mode--${m}`} onClick={() => onPick(m)}>
            {content}
          </button>
        ) : (
          <Link key={m} href={`/quiz/${themeSlug}?mode=${m}`} className={`qz-mode qz-mode--${m}`}>
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
  const [results, setResults] = useState<boolean[]>([]);
  const [missed, setMissed] = useState<Topic[]>([]);
  const [answers, setAnswers] = useState<{ q: number; a: number }[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const start = (m: QuizMode) => {
    // Tirage côté navigateur uniquement (évite un écart entre le rendu serveur et le navigateur).
    setMode(m);
    setQuestions(draw(theme.questions, QUIZ_MODES[m].count));
    setIndex(0);
    setPicked(null);
    setResults([]);
    setMissed([]);
    setAnswers([]);
    setStreak(0);
    setBestStreak(0);
    setStartedAt(Date.now());
    setDone(false);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const quit = () => {
    setMode(null);
    setQuestions([]);
    setDone(false);
  };

  // Format demandé dans l'adresse (?mode=flash / ?mode=pros), depuis la page des thèmes.
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("mode");
    if (isMode(m)) start(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Accueil : choix du format ---------- */
  if (!mode || questions.length === 0) {
    return (
      <div className="qz" ref={topRef}>
        <div className="qz-intro">
          <p className="qz-intro__kicker">Prête à te tester ?</p>
          <ModePicker onPick={start} />
        </div>
        <details className="qz-board">
          <summary>🏅 Classement de la semaine</summary>
          <QuizLeaderboard theme={theme.slug} mode="pros" />
        </details>
      </div>
    );
  }

  const total = questions.length;
  const score = results.filter(Boolean).length;
  const label = QUIZ_MODES[mode].label;

  /* ---------- Résultat ---------- */
  if (done) {
    return (
      <div className="qz" ref={topRef}>
        <Result
          theme={theme}
          mode={mode}
          score={score}
          total={total}
          elapsed={elapsed}
          bestStreak={bestStreak}
          missed={missed}
          answers={answers}
          onReplay={() => start(mode)}
          onOther={() => start(mode === "flash" ? "pros" : "flash")}
        />
      </div>
    );
  }

  /* ---------- Jeu ---------- */
  const q = questions[index];
  const answered = picked !== null;
  const good = answered && picked === q.answer;

  const choose = (i: number) => {
    if (answered) return;
    const ok = i === q.answer;
    setPicked(i);
    setResults((r) => [...r, ok]);
    setAnswers((list) => [...list, { q: theme.questions.indexOf(q), a: i }]);
    if (ok) {
      const s = streak + 1;
      setStreak(s);
      setBestStreak((b) => Math.max(b, s));
      buzz(15);
    } else {
      setStreak(0);
      if (q.topic) setMissed((m) => [...m, q.topic!]);
      buzz([30, 40, 30]);
    }
  };

  const next = () => {
    if (index + 1 >= total) {
      setElapsed(Date.now() - startedAt);
      setDone(true);
      requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } else {
      setIndex(index + 1);
      setPicked(null);
    }
  };

  return (
    <div className="qz" ref={topRef}>
      <div className="qz-play">
        <div className="qz-bar">
          <button type="button" className="qz-bar__quit" onClick={quit} aria-label="Quitter le quiz">
            <Icon name="close" />
          </button>
          <div className="qz-dots" aria-label={`Question ${index + 1} sur ${total}`}>
            {questions.map((_, i) => (
              <span
                key={i}
                className={
                  i < results.length ? (results[i] ? "qz-dot qz-dot--ok" : "qz-dot qz-dot--ko") : i === index ? "qz-dot qz-dot--now" : "qz-dot"
                }
              />
            ))}
          </div>
          <span className={streak >= 2 ? "qz-streak qz-streak--on" : "qz-streak"} aria-label={`Série : ${streak}`}>
            🔥 {streak}
          </span>
        </div>

        <div className="qz-card" key={index}>
          <p className="qz-card__count">
            {MODE_EMOJI[mode]} {label} · {index + 1}/{total}
          </p>
          <h2 className="qz-card__q">{q.question}</h2>
          <div className="qz-answers" role="group" aria-label="Réponses">
            {q.choices.map((c, i) => {
              const state = !answered ? "" : i === q.answer ? " qz-answer--ok" : i === picked ? " qz-answer--ko" : " qz-answer--off";
              return (
                <button key={c} type="button" className={`qz-answer${state}`} onClick={() => choose(i)} disabled={answered}>
                  <span className="qz-answer__letter">{LETTERS[i]}</span>
                  <span className="qz-answer__text">{c}</span>
                  {answered && i === q.answer ? <Icon name="check" /> : null}
                  {answered && i === picked && i !== q.answer ? <Icon name="close" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        {answered ? (
          <div className={good ? "qz-feedback qz-feedback--ok" : "qz-feedback qz-feedback--ko"} role="status">
            <p className="qz-feedback__title">{good ? (streak >= 3 ? `🔥 ${streak} d'affilée !` : "✅ Bien joué !") : "❌ Pas tout à fait"}</p>
            <p className="qz-feedback__text">{q.explanation}</p>
            <button type="button" className="qz-feedback__btn" onClick={next} autoFocus>
              {index + 1 >= total ? "Voir mon score" : "Continuer"} <Icon name="arrow" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- Écran de résultat ---------- */
function Result({
  theme,
  mode,
  score,
  total,
  elapsed,
  bestStreak,
  missed,
  answers,
  onReplay,
  onOther,
}: {
  theme: QuizTheme;
  mode: QuizMode;
  score: number;
  total: number;
  elapsed: number;
  bestStreak: number;
  missed: Topic[];
  answers: { q: number; a: number }[];
  onReplay: () => void;
  onOther: () => void;
}) {
  const [cardState, setCardState] = useState<"idle" | "busy" | "saved">("idle");
  const [copied, setCopied] = useState(false);
  const label = QUIZ_MODES[mode].label;
  const ratio = score / total;
  const verdict = quizVerdict(score, total);
  const R = 52;
  const C = 2 * Math.PI * R;

  const shareImage = async () => {
    setCardState("busy");
    try {
      const blob = await makeScoreCard({ score, total, mode: label, theme: theme.title });
      const r = await shareScoreCard(blob, `J'ai eu ${score}/${total} au ${label} de La Petite IDE 👀 lapetiteide.fr/quiz`);
      setCardState(r === "downloaded" ? "saved" : "idle");
    } catch {
      setCardState("idle"); // partage annulé
    }
  };

  const challenge = async () => {
    const url = `${window.location.origin}/quiz/${theme.slug}?mode=${mode}`;
    const text = `J'ai eu ${score}/${total} au ${label} « ${theme.title} » de La Petite IDE. Tu fais mieux ? 👀`;
    try {
      if (navigator.share) await navigator.share({ title: `${label} : ${theme.title}`, text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
      }
    } catch {
      /* partage annulé */
    }
  };

  // Regroupe les erreurs par fiche du pack.
  const counts = new Map<Topic, number>();
  missed.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
  const review = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="qz-result">
      {ratio >= 0.7 ? <Confetti /> : null}
      <p className="qz-result__mode">
        {MODE_EMOJI[mode]} {label}
      </p>
      <div className="qz-ring" role="img" aria-label={`Score : ${score} sur ${total}`}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r={R} className="qz-ring__bg" />
          <circle cx="60" cy="60" r={R} className="qz-ring__fg" strokeDasharray={C} strokeDashoffset={C * (1 - ratio)} />
        </svg>
        <span className="qz-ring__value">
          {score}
          <small>/{total}</small>
        </span>
      </div>
      <h2 className="qz-result__title">{verdict.title}</h2>

      <div className="qz-stats">
        <span>✅ {score} bonne{score > 1 ? "s" : ""}</span>
        <span>⏱ {fmt(elapsed)}</span>
        <span>🔥 série de {bestStreak}</span>
      </div>

      {theme.packSlug && review.length ? (
        <div className="qz-review">
          <p className="qz-review__title">📌 À revoir dans le pack</p>
          <div className="qz-review__chips">
            {review.map(([t, n]) => (
              <span key={t}>
                {TOPICS[t]} <b>×{n}</b>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {theme.packSlug ? (
        <Link href={`/${theme.packSlug}?src=quiz`} className="qz-cta">
          <span>
            <strong>{ratio === 1 ? "Garde ce niveau toute l'année" : "Retiens tout en un clin d'œil"}</strong>
            <small>{theme.packName}</small>
          </span>
          <Icon name="arrow" />
        </Link>
      ) : null}

      <div className="qz-actions">
        <button type="button" onClick={shareImage} disabled={cardState === "busy"}>
          <span aria-hidden="true">📸</span>
          {cardState === "busy" ? "…" : cardState === "saved" ? "Enregistrée" : "Partager"}
        </button>
        <button type="button" onClick={challenge}>
          <span aria-hidden="true">⚔️</span>
          {copied ? "Lien copié" : "Défier"}
        </button>
        <button type="button" onClick={onReplay}>
          <span aria-hidden="true">🔁</span>
          Rejouer
        </button>
      </div>
      <button type="button" className="qz-switch" onClick={onOther}>
        Passer au format {mode === "flash" ? `« ${QUIZ_MODES.pros.label} » 🏆` : `« ${QUIZ_MODES.flash.label} » ⚡`}
      </button>

      <details className="qz-board" open>
        <summary>🏅 Entre dans le classement</summary>
        <QuizLeaderboard theme={theme.slug} mode={mode} result={{ answers, ms: elapsed }} />
      </details>

      <Link href="/quiz" className="qz-other">
        Autres thèmes
      </Link>
    </div>
  );
}

/** Confettis légers en CSS (aucune bibliothèque). */
function Confetti() {
  const colors = ["#4E7AC7", "#EAA7C1", "#C5D8F4", "#F2B9CF", "#2F8F6B", "#FFD166"];
  return (
    <div className="qz-confetti" aria-hidden="true">
      {Array.from({ length: 36 }, (_, i) => (
        <i
          key={i}
          style={
            {
              left: `${(i * 97) % 100}%`,
              background: colors[i % colors.length],
              animationDelay: `${(i % 9) * 0.08}s`,
              "--x": `${((i * 53) % 60) - 30}px`,
              "--r": `${(i * 47) % 360}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

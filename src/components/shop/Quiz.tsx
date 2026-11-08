"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { QUIZ_MODES, QUIZ_PACK_SLUG, type QuizMode, type QuizQuestion, type QuizTheme, quizVerdict } from "@/content/quiz";
import { getPack } from "@/content/packs";
import { QuizEmailCapture } from "./QuizEmailCapture";

/** Mélange de Fisher-Yates. */
function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Question tirée : réponses mélangées, avec le lien vers la question et les réponses d'origine (pour la correction par email). */
interface DrawnQuestion extends QuizQuestion {
  index: number;
  order: number[];
}

/** Tire `n` questions au hasard et mélange l'ordre des réponses. */
function draw(all: QuizQuestion[], n: number): DrawnQuestion[] {
  return shuffle(all.map((q, index) => ({ q, index })))
    .slice(0, Math.min(n, all.length))
    .map(({ q, index }) => {
      const order = shuffle(q.choices.map((_, i) => i));
      return { ...q, index, order, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer) };
    });
}

/** Statistiques anonymes (aucune donnée personnelle) : quiz lancé, terminé, clic vers le pack, défi. */
function track(event: "start" | "finish" | "pack" | "share", theme: string, mode: QuizMode, pct?: number) {
  try {
    const body = JSON.stringify({ event, theme, mode, ...(pct === undefined ? {} : { pct }) });
    if (!navigator.sendBeacon?.("/api/quiz-stat", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/quiz-stat", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch {
    /* statistiques facultatives */
  }
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
export function ModePicker({ onPick, themeSlug, total }: { onPick?: (m: QuizMode) => void; themeSlug?: string; total?: number }) {
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
              {Math.min(mode.count, total ?? mode.count)} questions · {mode.duration}
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

export function Quiz({ theme, emailCapture = true }: { theme: QuizTheme; emailCapture?: boolean }) {
  const [mode, setMode] = useState<QuizMode | null>(null);
  const router = useRouter();
  const [questions, setQuestions] = useState<DrawnQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
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
    setAnswers([]);
    setStreak(0);
    setBestStreak(0);
    setStartedAt(Date.now());
    setDone(false);
    track("start", theme.slug, m);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  // La croix ramène à la liste des quiz.
  const quit = () => router.push("/quiz");

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
          <ModePicker onPick={start} total={theme.questions.length} />
        </div>
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
          answers={answers}
          emailCapture={emailCapture}
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
    setAnswers((list) => [...list, { q: q.index, a: q.order[i] }]);
    setResults((r) => [...r, ok]);
    if (ok) {
      const s = streak + 1;
      setStreak(s);
      setBestStreak((b) => Math.max(b, s));
      buzz(15);
    } else {
      setStreak(0);
      buzz([30, 40, 30]);
    }
  };

  const next = () => {
    if (index + 1 >= total) {
      setElapsed(Date.now() - startedAt);
      setDone(true);
      track("finish", theme.slug, mode, (results.filter(Boolean).length / total) * 100);
      requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } else {
      setIndex(index + 1);
      setPicked(null);
      // Nouvelle question : on remonte en haut du quiz si besoin.
      requestAnimationFrame(() => {
        const top = topRef.current?.getBoundingClientRect().top ?? 0;
        if (top < 0) topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  return (
    <div className="qz" ref={topRef}>
      <div className={answered ? "qz-play qz-play--answered" : "qz-play"}>
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
  answers,
  emailCapture,
  onReplay,
  onOther,
}: {
  theme: QuizTheme;
  mode: QuizMode;
  score: number;
  total: number;
  elapsed: number;
  bestStreak: number;
  answers: { q: number; a: number }[];
  emailCapture: boolean;
  onReplay: () => void;
  onOther: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const label = QUIZ_MODES[mode].label;
  const ratio = score / total;
  const verdict = quizVerdict(score, total);
  const other: QuizMode = mode === "flash" ? "pros" : "flash";
  // Pack du thème, sinon le pack des constantes (utile pour tous les thèmes).
  const pack = getPack(theme.packSlug ?? QUIZ_PACK_SLUG);
  const R = 52;
  const C = 2 * Math.PI * R;

  const challenge = async () => {
    track("share", theme.slug, mode);
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

      {emailCapture ? <QuizEmailCapture theme={theme.slug} mode={mode} answers={answers} /> : null}

      {pack ? (
        <Link href={`/${pack.slug}?src=quiz`} className="qz-pack" onClick={() => track("pack", theme.slug, mode)}>
          <span className="qz-pack__shine" aria-hidden="true" />
          {pack.images ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pack.images.card} alt="" width={800} height={800} className="qz-pack__img" />
          ) : null}
          <span className="qz-pack__body">
            <span className="qz-pack__hook">
              {theme.packSlug ? (score < total ? "Corrige tes erreurs ✨" : "Garde ce niveau ✨") : "Révise tes constantes ✨"}
            </span>
            <span className="qz-pack__name">{pack.name}</span>
          </span>
          <span className="qz-pack__go">
            Voir <Icon name="arrow" />
          </span>
        </Link>
      ) : null}

      <div className="qz-actions">
        <button type="button" onClick={onReplay}>
          <span aria-hidden="true">🔁</span>
          Rejouer
        </button>
        <button type="button" onClick={challenge}>
          <span aria-hidden="true">⚔️</span>
          {copied ? "Lien copié" : "Défier"}
        </button>
        <button type="button" onClick={onOther} className={`qz-actions__mode qz-actions__mode--${other}`}>
          <span aria-hidden="true">{MODE_EMOJI[other]}</span>
          {other === "pros" ? "Mode Pros" : "Mode Flash"}
        </button>
      </div>

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

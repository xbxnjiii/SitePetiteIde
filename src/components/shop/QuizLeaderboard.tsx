"use client";
import { useCallback, useEffect, useState } from "react";
import { QUIZ_MODES, type QuizMode } from "@/content/quiz";

interface Entry {
  pseudo: string;
  score: number;
  total: number;
  ms: number;
}

const PSEUDO_KEY = "lpi-quiz-pseudo";
const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, "0")}`;

/** Top 10 de la semaine ; si `result` est fourni, propose d'y inscrire son score. */
export function QuizLeaderboard({
  theme,
  mode,
  result,
}: {
  theme: string;
  mode: QuizMode;
  result?: { answers: { q: number; a: number }[]; ms: number };
}) {
  const [top, setTop] = useState<Entry[] | null>(null);
  const [pseudo, setPseudo] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [mine, setMine] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/leaderboard?theme=${theme}&mode=${mode}`);
      const d = (await r.json()) as { top?: Entry[] };
      setTop(d.top ?? []);
    } catch {
      setTop([]);
    }
  }, [theme, mode]);

  useEffect(() => {
    load();
    try {
      setPseudo(localStorage.getItem(PSEUDO_KEY) ?? "");
    } catch {
      /* stockage indisponible */
    }
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result) return;
    setState("busy");
    setMessage(null);
    try {
      const r = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, mode, pseudo, answers: result.answers, ms: result.ms }),
      });
      const d = (await r.json()) as { rank?: number; error?: string };
      if (!r.ok) {
        setState("error");
        setMessage(
          d.error === "pseudo"
            ? "Choisis un pseudo de 2 à 16 caractères (lettres, chiffres), sans grossièreté."
            : d.error === "trop"
              ? "Trop d'envois pour le moment, réessaie dans un moment."
              : "Le classement est momentanément indisponible.",
        );
        return;
      }
      try {
        localStorage.setItem(PSEUDO_KEY, pseudo.trim());
      } catch {
        /* rien */
      }
      setMine(pseudo.trim().toLowerCase());
      setState("done");
      setMessage(`Tu es ${d.rank === 1 ? "1re" : `${d.rank}e`} cette semaine ! 🎉`);
      load();
    } catch {
      setState("error");
      setMessage("Le classement est momentanément indisponible.");
    }
  };

  return (
    <div className="board">
      <p className="board__title">🏅 Top 10 de la semaine · {QUIZ_MODES[mode].label}</p>

      {result && state !== "done" ? (
        <form className="board__form" onSubmit={submit}>
          <label htmlFor="board-pseudo" className="visually-hidden">
            Ton pseudo
          </label>
          <input
            id="board-pseudo"
            className="input board__input"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder="Ton pseudo"
            maxLength={16}
            autoComplete="nickname"
            required
          />
          <button type="submit" className="btn btn--primary btn--sm" disabled={state === "busy"}>
            {state === "busy" ? "…" : "Me classer"}
          </button>
        </form>
      ) : null}
      {message ? <p className={state === "error" ? "board__msg board__msg--err" : "board__msg"}>{message}</p> : null}

      {top === null ? (
        <p className="board__empty">Chargement…</p>
      ) : top.length === 0 ? (
        <p className="board__empty">Personne encore cette semaine : sois la première !</p>
      ) : (
        <ol className="board__list">
          {top.map((e, i) => (
            <li key={e.pseudo} className={mine && e.pseudo.toLowerCase() === mine ? "board__me" : undefined}>
              <span className="board__rank">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
              <span className="board__pseudo">{e.pseudo}</span>
              <span className="board__score">
                {e.score}/{e.total}
              </span>
              <span className="board__time">{fmt(e.ms)}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="board__note">Remis à zéro chaque lundi · seul ton pseudo est affiché.</p>
    </div>
  );
}

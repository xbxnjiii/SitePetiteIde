"use client";
import Link from "next/link";
import { useState } from "react";
import type { QuizMode } from "@/content/quiz";

/** Fin de quiz : correction détaillée + fiche gratuite par email (avec consentement). */
export function QuizEmailCapture({ theme, mode, answers }: { theme: string; mode: QuizMode; answers: { q: number; a: number }[] }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // champ piège anti-robots
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setMessage("Coche la case pour recevoir tes emails.");
      return;
    }
    setState("busy");
    setMessage(null);
    try {
      const r = await fetch("/api/quiz-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent, theme, mode, answers, website }),
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setState("error");
        setMessage(d.error === "email" ? "Vérifie ton adresse email." : "L'envoi n'a pas fonctionné, réessaie dans un instant.");
        return;
      }
      setState("sent");
    } catch {
      setState("error");
      setMessage("L'envoi n'a pas fonctionné, réessaie dans un instant.");
    }
  };

  if (state === "sent") {
    return (
      <div className="qz-mail qz-mail--sent" role="status">
        <p className="qz-mail__title">C&apos;est envoyé 💌</p>
        <p className="qz-mail__text">Ta correction et ta fiche gratuite arrivent dans ta boîte mail. Pense à regarder tes spams !</p>
      </div>
    );
  }

  return (
    <form className="qz-mail" onSubmit={submit}>
      <p className="qz-mail__title">📩 Reçois ta correction détaillée + 1 fiche gratuite</p>
      <p className="qz-mail__text">Toutes les réponses expliquées, directement dans ta boîte mail.</p>
      <div className="qz-mail__row">
        <label htmlFor="qz-mail-input" className="visually-hidden">
          Ton email
        </label>
        <input
          id="qz-mail-input"
          className="input qz-mail__input"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="prenom@exemple.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="qz-mail__btn" disabled={state === "busy"}>
          {state === "busy" ? "…" : "Recevoir"}
        </button>
      </div>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="qz-mail__hp"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />
      <label className="qz-mail__consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          J&apos;accepte de recevoir ma correction, ma fiche gratuite et 2 emails de conseils et d&apos;offre de La Petite IDE.
          Désinscription en 1 clic. <Link href="/confidentialite" target="_blank">Confidentialité</Link>
        </span>
      </label>
      {message ? (
        <p className="qz-mail__error" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}

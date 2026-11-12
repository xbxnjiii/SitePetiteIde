"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { QuizMode } from "@/content/quiz";
import { QuizArt } from "./QuizArt";

/** Fin de quiz : un bouton qui attire l'œil, puis une fenêtre pour recevoir la correction + 1 fiche gratuite (avec consentement). */
export function QuizEmailCapture({
  theme,
  mode,
  answers,
}: {
  theme: string;
  mode: QuizMode;
  answers: { q: number; a: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // champ piège anti-robots
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">(
    "idle",
  );
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
        setMessage(
          d.error === "email"
            ? "Vérifie ton adresse email."
            : "L'envoi n'a pas fonctionné, réessaie dans un instant.",
        );
        return;
      }
      setState("sent");
    } catch {
      setState("error");
      setMessage("L'envoi n'a pas fonctionné, réessaie dans un instant.");
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      clearTimeout(t);
    };
  }, [open]);

  return (
    <>
      {state === "sent" ? (
        <p className="qz-mailcta qz-mailcta--sent" role="status">
          <QuizArt name="mail" /> Correction envoyée : regarde ta
          boîte mail (et tes spams) !
        </p>
      ) : (
        <button
          type="button"
          className="qz-mailcta"
          onClick={() => setOpen(true)}
        >
          <span className="qz-mailcta__icon">
            <QuizArt name="mail" />
          </span>
          <span className="qz-mailcta__text">
            <strong>Reçois ta correction</strong>
            <span>+ 1 fiche offerte, par email</span>
          </span>
          <span className="qz-mailcta__tag qz-mailcta__tag--arrow" aria-hidden="true">
            <Icon name="arrow" />
          </span>
        </button>
      )}
      {open ? (
        <div
          className="modal"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            className="modal__panel qz-mailmodal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qz-mail-title"
          >
            <div className="modal__head">
              <h2 id="qz-mail-title">
                <QuizArt name="mail" /> Ta correction + 1 fiche gratuite
              </h2>
              <button
                type="button"
                className="modal__close"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
              >
                <Icon name="close" />
              </button>
            </div>
            {state === "sent" ? (
              <div className="qz-mail qz-mail--sent" role="status">
                <p className="qz-mail__title">
                  C&apos;est envoyé <QuizArt name="sparkles" />
                </p>
                <p className="qz-mail__text">
                  Ta correction et ta fiche gratuite arrivent dans ta boîte
                  mail. Pense à regarder tes spams !
                </p>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setOpen(false)}
                >
                  Super, merci !
                </button>
              </div>
            ) : (
              <form className="qz-mail" onSubmit={submit}>
                <div className="qz-mail__row">
                  <label htmlFor="qz-mail-input" className="visually-hidden">
                    Ton email
                  </label>
                  <input
                    id="qz-mail-input"
                    ref={inputRef}
                    className="input qz-mail__input"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    placeholder="prenom@exemple.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="qz-mail__btn"
                    disabled={state === "busy"}
                  >
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
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    J&apos;accepte de recevoir les emails de La Petite IDE.{" "}
                    <Link href="/confidentialite#finalites" target="_blank">
                      En savoir plus
                    </Link>
                  </span>
                </label>
                {message ? (
                  <p className="qz-mail__error" role="alert">
                    {message}
                  </p>
                ) : null}
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

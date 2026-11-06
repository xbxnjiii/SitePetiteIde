"use client";
import { useState } from "react";

export function RecoverForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    try {
      const r = await fetch("/api/retrouver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(r.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "sent") {
    return (
      <div className="recover recover--sent" role="status">
        <strong>C&apos;est envoyé 💌</strong>
        <p>
          Si un achat correspond à <b>{email}</b>, tu vas recevoir tes liens dans quelques instants. Pense à regarder dans tes spams.
        </p>
      </div>
    );
  }

  return (
    <form className="recover" onSubmit={submit}>
      <label htmlFor="recover-email" className="checkout__label">
        Ton email
      </label>
      <input
        id="recover-email"
        className="input"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="prenom@exemple.fr"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" className="btn btn--primary btn--block" disabled={state === "busy"}>
        {state === "busy" ? "Envoi…" : "Recevoir mes liens"}
      </button>
      {state === "error" ? (
        <p className="alert" role="alert">
          Vérifie ton adresse email et réessaie.
        </p>
      ) : null}
    </form>
  );
}

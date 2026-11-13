"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { BADGES, dayKey, levelOf, liveStreak, playedToday, setSound, useProgress } from "@/lib/progress";
import { DailyQuestionModal } from "./DailyQuestion";
import { QuizArt } from "./QuizArt";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
}

/**
 * Bandeau de progression de la page Quiz (série de jours, niveau, succès) + fenêtre « Ma progression ».
 * Tout est lu sur l'appareil : rien ne s'affiche avant que le navigateur ait chargé (pas d'écart serveur / navigateur).
 */
export function QuizProfile({ themes }: { themes: { slug: string; title: string }[] }) {
  const p = useProgress();
  const [open, setOpen] = useState(false);
  const [daily, setDaily] = useState(false);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const read = () => setInstall(((window as unknown as { __lpiInstall?: InstallEvent }).__lpiInstall as InstallEvent) ?? null);
    read();
    window.addEventListener("lpi:install", read);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent) && !standalone);
    return () => window.removeEventListener("lpi:install", read);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!p) return <p className="qzp qzp--empty">Choisis un thème, puis ton format</p>;

  const lvl = levelOf(p.xp);
  const streak = liveStreak(p);
  const badgeCount = Object.keys(p.badges).length;
  const dailyDone = p.daily.last === dayKey();
  const toReview = themes.map((t) => ({ ...t, n: p.wrong[t.slug]?.length ?? 0 })).filter((t) => t.n > 0);

  return (
    <>
      <div className="qzp">
        <button type="button" className="qzp__main" onClick={() => setOpen(true)} aria-label="Ma progression">
          <span className={streak > 0 ? (playedToday(p) ? "qzp__chip qzp__chip--fire" : "qzp__chip qzp__chip--warn") : "qzp__chip"}>
            <QuizArt name="flame" /> {streak}
          </span>
          <span className="qzp__level">
            <span className="qzp__level-top">
              <strong>Niveau {lvl.level}</strong>
              <small>{p.xp} pts</small>
            </span>
            <span className="qzp__bar">
              <i style={{ width: `${Math.round(lvl.ratio * 100)}%` }} />
            </span>
          </span>
          <span className="qzp__chip">
            <QuizArt name="medal" /> {badgeCount}
          </span>
        </button>
        <button type="button" className={dailyDone ? "qzp__daily qzp__daily--done" : "qzp__daily"} onClick={() => setDaily(true)} aria-label="Question du jour">
          <QuizArt name="calendar" />
          {dailyDone ? null : <i aria-hidden="true" />}
        </button>
      </div>

      {daily ? <DailyQuestionModal onClose={() => setDaily(false)} /> : null}

      {open ? (
        <div className="modal" role="presentation" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal__panel prog" role="dialog" aria-modal="true" aria-labelledby="prog-title">
            <div className="modal__head">
              <h2 id="prog-title">Ma progression</h2>
              <button type="button" className="modal__close" onClick={() => setOpen(false)} aria-label="Fermer">
                <Icon name="close" />
              </button>
            </div>

            <div className="prog__stats">
              <div>
                <QuizArt name="flame" />
                <strong>{streak}</strong>
                <span>jour{streak > 1 ? "s" : ""} d&apos;affilée</span>
              </div>
              <div>
                <QuizArt name="star" />
                <strong>{lvl.level}</strong>
                <span>niveau · {p.xp} pts</span>
              </div>
              <div>
                <QuizArt name="check" />
                <strong>{p.plays}</strong>
                <span>quiz terminé{p.plays > 1 ? "s" : ""}</span>
              </div>
            </div>
            <p className="prog__next">
              {streak > 0 && !playedToday(p)
                ? "Joue aujourd'hui pour garder ta série !"
                : `Encore ${lvl.ceil - p.xp} points pour le niveau ${lvl.level + 1}.`}
            </p>

            {toReview.length ? (
              <>
                <h3 className="prog__h">Mes erreurs à réviser</h3>
                <div className="prog__review">
                  {toReview.map((t) => (
                    <Link key={t.slug} href={`/quiz/${t.slug}?mode=revision`} className="prog__row">
                      <QuizArt name="replay" />
                      <span>{t.title}</span>
                      <small>
                        {t.n} question{t.n > 1 ? "s" : ""}
                      </small>
                      <Icon name="arrow" />
                    </Link>
                  ))}
                </div>
              </>
            ) : null}

            <h3 className="prog__h">
              Succès <small>{badgeCount}/{BADGES.length}</small>
            </h3>
            <ul className="prog__badges">
              {BADGES.map((b) => (
                <li key={b.id} className={p.badges[b.id] ? "prog__badge prog__badge--on" : "prog__badge"}>
                  <span className="prog__badge-icon">
                    <QuizArt name={b.art} />
                  </span>
                  <strong>{b.title}</strong>
                  <small>{b.hint}</small>
                </li>
              ))}
            </ul>

            <h3 className="prog__h">Réglages</h3>
            <button type="button" className="prog__row" onClick={() => setSound(!p.sound)} aria-pressed={p.sound}>
              <QuizArt name={p.sound ? "sound" : "mute"} />
              <span>Sons du quiz</span>
              <small>{p.sound ? "Activés" : "Coupés"}</small>
            </button>
            {install ? (
              <button
                type="button"
                className="prog__row"
                onClick={() => {
                  void install.prompt();
                  setInstall(null);
                }}
              >
                <QuizArt name="phone" />
                <span>Installer l&apos;appli sur mon téléphone</span>
                <Icon name="arrow" />
              </button>
            ) : ios ? (
              <p className="prog__row prog__row--note">
                <QuizArt name="phone" />
                <span>
                  Pour installer l&apos;appli : bouton <strong>Partager</strong> de Safari, puis <strong>« Sur l&apos;écran d&apos;accueil »</strong>.
                </span>
              </p>
            ) : null}
            <p className="prog__privacy">Ta progression est enregistrée sur cet appareil uniquement, sans compte.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

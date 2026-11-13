"use client";
import { loadProgress } from "./progress";

// Petits sons du quiz, synthétisés par le navigateur (Web Audio) : aucun fichier à télécharger.
// Coupés si le visiteur a désactivé le son (réglage enregistré sur l'appareil).

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!loadProgress().sound) return null;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Joue une suite de notes : [fréquence Hz, début s, durée s]. */
function notes(seq: [number, number, number][], type: OscillatorType = "sine", volume = 0.12) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime;
  for (const [freq, at, dur] of seq) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + at);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0 + at);
    osc.stop(t0 + at + dur + 0.02);
  }
}

export const sfx = {
  tick: () => notes([[660, 0, 0.12]], "triangle", 0.1),
  go: () => notes([[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.25]], "triangle", 0.13),
  good: () => notes([[660, 0, 0.1], [880, 0.09, 0.18]]),
  bad: () => notes([[233, 0, 0.16], [185, 0.13, 0.24]], "triangle", 0.11),
  win: () => notes([[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.4]], "triangle", 0.13),
  end: () => notes([[440, 0, 0.14], [523, 0.13, 0.3]]),
};

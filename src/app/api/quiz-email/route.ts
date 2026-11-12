import { type QuizMode, QUIZ_MODES, getQuiz } from "@/content/quiz";
import { FREE_SHEET, SEQUENCE_DELAYS } from "@/content/lead";
import { sendEmail } from "@/lib/email";
import { getEnvAsync, requireVar, siteUrl } from "@/lib/env";
import { isAllowedOrigin } from "@/lib/origin";
import { type CorrectionItem, correctionEmail, offerEmail, tipsEmail } from "@/lib/quiz-emails";
import { recordQuizEvent } from "@/lib/quiz-stats";
import { getSettings } from "@/lib/settings";
import { signToken } from "@/lib/signed";

// POST /api/quiz-email {email, consent, theme, mode, answers:[{q,a}], website}
// Envoie la correction + la fiche gratuite, et programme 2 emails (conseils J+2, offre J+5).
// Rien n'est stocké : les envois programmés sont gérés par Resend, et le lien de désinscription
// contient (signés) les identifiants des emails à annuler.

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const isMode = (v: unknown): v is QuizMode => v === "flash" || v === "pros";

export async function POST(request: Request) {
  const env = await getEnvAsync();
  const base = siteUrl(env);
  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin, base)) return new Response("Origine non autorisée", { status: 403 });
  if (!(await getSettings(env)).quizEmails) return Response.json({ error: "off" }, { status: 503 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  // Champ piège invisible : rempli uniquement par les robots.
  if (body?.website) return Response.json({ ok: true });
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) return Response.json({ error: "email" }, { status: 400 });
  if (body?.consent !== true) return Response.json({ error: "consent" }, { status: 400 });
  const theme = getQuiz(typeof body?.theme === "string" ? body.theme : "");
  const mode = body?.mode;
  if (!theme || !isMode(mode) || !Array.isArray(body?.answers)) return Response.json({ error: "quiz" }, { status: 400 });

  // Réponses : index de question + choix (25 au maximum, sans doublon).
  const seen = new Set<number>();
  const items: CorrectionItem[] = [];
  for (const a of (body.answers as unknown[]).slice(0, QUIZ_MODES.pros.count)) {
    const qi = (a as { q?: unknown })?.q;
    const ci = (a as { a?: unknown })?.a;
    if (typeof qi !== "number" || typeof ci !== "number" || seen.has(qi) || !theme.questions[qi] || !theme.questions[qi].choices[ci]) continue;
    seen.add(qi);
    items.push({ q: theme.questions[qi], picked: ci });
  }
  if (!items.length) return Response.json({ error: "quiz" }, { status: 400 });

  try {
    const secret = requireVar(env, "DOWNLOAD_TOKEN_SECRET");
    const now = Date.now();
    const day = 86_400_000;
    const tipsAt = new Date(now + SEQUENCE_DELAYS.tips * day);
    const offerAt = new Date(now + SEQUENCE_DELAYS.offer * day);
    const unsubExp = Math.floor(now / 1000) + 400 * 86_400;
    const hex = (buf: ArrayBuffer, n: number) => Array.from(new Uint8Array(buf).slice(0, n), (b) => b.toString(16).padStart(2, "0")).join("");
    const emailHash = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email)), 32);
    const key = emailHash.slice(0, 24);
    // Empreinte du quiz joué : une correction par quiz (rejouer le même quiz avec les mêmes réponses n'envoie rien de plus).
    const quizHash = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([theme.slug, mode, items.map((i) => [theme.questions.indexOf(i.q), i.picked])]))), 8);
    const idem = (n: string) => `quiz-${n}-${key}-${Math.floor(now / day)}`;
    const unsub = async (ids: (string | null)[]) =>
      `${base}/api/desinscription?t=${await signToken({ ids: ids.filter(Boolean) }, unsubExp, secret, "unsub")}`;
    const packUrl = theme.packSlug ? `${base}/${theme.packSlug}?src=email` : `${base}/?src=email`;

    // La série « conseils puis offre » n'est programmée qu'une fois par adresse : un repère anonyme
    // (empreinte de l'email, jamais l'adresse elle-même) est gardé dans R2.
    const leadKey = `leads/${new URL(base).hostname}/${emailHash}`;
    const known = Boolean(await env.PDF_BUCKET?.head(leadKey).catch(() => null));

    let tipsId: string | null = null;
    let offerId: string | null = null;
    if (!known) {
      // Ordre inverse : chaque email connaît les identifiants des envois suivants à annuler.
      const offerUnsub = await unsub([]);
      const offer = offerEmail({ packUrl, sendAt: offerAt, unsubscribeUrl: offerUnsub });
      offerId = await sendEmail(env, { to: email, ...offer, scheduledAt: offerAt.toISOString(), idempotencyKey: idem("offer"), unsubscribeUrl: offerUnsub });

      const tipsUnsub = await unsub([offerId]);
      const tips = tipsEmail({ quizUrl: `${base}/quiz?src=email`, unsubscribeUrl: tipsUnsub });
      tipsId = await sendEmail(env, { to: email, ...tips, scheduledAt: tipsAt.toISOString(), idempotencyKey: idem("tips"), unsubscribeUrl: tipsUnsub });
    }

    // La correction de CE quiz, à chaque fois. La fiche gratuite n'est jointe qu'à la toute première.
    const firstUnsub = await unsub([tipsId, offerId]);
    const freeExp = Math.floor(now / 1000) + FREE_SHEET.days * 86_400;
    const freeUrl = known ? null : `${base}/fiche-gratuite?t=${await signToken({ f: 1 }, freeExp, secret, "free")}`;
    const first = correctionEmail({ themeTitle: theme.title, modeLabel: QUIZ_MODES[mode].label, items, freeUrl, packUrl, unsubscribeUrl: firstUnsub, aboutPack: Boolean(theme.packSlug) });
    await sendEmail(env, { to: email, ...first, idempotencyKey: `quiz-correction-${key}-${quizHash}`, unsubscribeUrl: firstUnsub });

    if (!known) {
      await env.PDF_BUCKET?.put(leadKey, JSON.stringify({ at: new Date(now).toISOString() }), { httpMetadata: { contentType: "application/json" } }).catch(() => {});
      // « Nouveaux contacts » de l'admin : une seule fois par adresse.
      await recordQuizEvent(env, { event: "email", theme: theme.slug, mode, pct: null }).catch(() => {});
    }
    console.log("quiz-email:", known ? "correction envoyée (contact connu)" : "nouveau contact, séquence programmée", theme.slug, mode);
    return Response.json({ ok: true, first: !known });
  } catch (err) {
    console.error("quiz-email:", err instanceof Error ? err.message : err);
    return Response.json({ error: "envoi" }, { status: 503 });
  }
}

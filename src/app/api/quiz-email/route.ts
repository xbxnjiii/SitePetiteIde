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
    // Une seule séquence par adresse et par jour (clé d'idempotence Resend).
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
    const key = Array.from(new Uint8Array(digest).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
    const idem = (n: string) => `quiz-${n}-${key}-${Math.floor(now / day)}`;
    const unsub = async (ids: (string | null)[]) =>
      `${base}/api/desinscription?t=${await signToken({ ids: ids.filter(Boolean) }, unsubExp, secret, "unsub")}`;
    const packUrl = theme.packSlug ? `${base}/${theme.packSlug}?src=email` : `${base}/?src=email`;

    // Ordre inverse : chaque email connaît les identifiants des envois suivants à annuler.
    const offerUnsub = await unsub([]);
    const offer = offerEmail({ packUrl, sendAt: offerAt, unsubscribeUrl: offerUnsub });
    const offerId = await sendEmail(env, { to: email, ...offer, scheduledAt: offerAt.toISOString(), idempotencyKey: idem("offer"), unsubscribeUrl: offerUnsub });

    const tipsUnsub = await unsub([offerId]);
    const tips = tipsEmail({ quizUrl: `${base}/quiz?src=email`, unsubscribeUrl: tipsUnsub });
    const tipsId = await sendEmail(env, { to: email, ...tips, scheduledAt: tipsAt.toISOString(), idempotencyKey: idem("tips"), unsubscribeUrl: tipsUnsub });

    const firstUnsub = await unsub([tipsId, offerId]);
    const freeExp = Math.floor(now / 1000) + FREE_SHEET.days * 86_400;
    const freeUrl = `${base}/fiche-gratuite?t=${await signToken({ f: 1 }, freeExp, secret, "free")}`;
    const first = correctionEmail({ themeTitle: theme.title, modeLabel: QUIZ_MODES[mode].label, items, freeUrl, packUrl, unsubscribeUrl: firstUnsub, aboutPack: Boolean(theme.packSlug) });
    // null = même adresse déjà inscrite aujourd'hui (Resend ignore le doublon) : pas un nouveau contact.
    const firstId = await sendEmail(env, { to: email, ...first, idempotencyKey: idem("first"), unsubscribeUrl: firstUnsub });

    console.log("quiz-email: séquence programmée", theme.slug, mode);
    if (firstId) await recordQuizEvent(env, { event: "email", theme: theme.slug, mode, pct: null }).catch(() => {});
    return Response.json({ ok: true });
  } catch (err) {
    console.error("quiz-email:", err instanceof Error ? err.message : err);
    return Response.json({ error: "envoi" }, { status: 503 });
  }
}

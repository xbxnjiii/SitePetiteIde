import { FREE_SHEET } from "@/content/lead";
import { QUIZ_MODES, QUIZ_PACK_SLUG, quizzes } from "@/content/quiz";
import { getPack } from "@/content/packs";
import { sendEmail, sendOrderEmail, sendPrintOrderNotice, sendRecoveryEmail, sendShippedEmail, sendUpdateEmails } from "@/lib/email";
import { type AppEnv, requireVar, siteUrl } from "@/lib/env";
import { correctionEmail, offerEmail, tipsEmail } from "@/lib/quiz-emails";
import { signToken } from "@/lib/signed";

// Outils › « Aperçu des emails » : envoie un exemple de CHAQUE email du site à une adresse,
// avec des données fictives (commande LPI-EXEMPLE…). Aucun client n'est concerné.

export const PREVIEW_COUNT = 10;

const pause = () => new Promise((r) => setTimeout(r, 600)); // limite Resend : 2 envois / seconde

export async function sendAllPreviews(env: AppEnv, to: string): Promise<number> {
  const base = siteUrl(env);
  const secret = requireVar(env, "DOWNLOAD_TOKEN_SECRET");
  const pack = getPack(QUIZ_PACK_SLUG);
  if (!pack) throw new Error("Pack introuvable");
  const stamp = Date.now();
  const key = (n: string) => `apercu-${n}-${stamp}`;
  const now = Math.floor(stamp / 1000);
  const expiresAt = now + 30 * 86_400;
  const reference = "LPI-EXEMPLE";
  const sessionId = `cs_test_apercu${stamp}`;
  // Liens d'exemple : ils mènent à « Retrouver mon achat » (pas de vrai fichier pour une fausse commande).
  const links = [{ label: `Télécharger · ${pack.name} (PDF)`, url: `${base}/retrouver-mon-achat` }];
  const imagesUrl = `${base}/retrouver-mon-achat`;
  const address = ["Prénom Nom", "1 rue de l'Exemple", "75000 Paris", "France"];
  const unsub = `${base}/api/desinscription?t=${await signToken({ ids: [] }, now + 400 * 86_400, secret, "unsub")}`;
  const freeUrl = `${base}/fiche-gratuite?t=${await signToken({ f: 1 }, now + FREE_SHEET.days * 86_400, secret, "free")}`;
  const theme = quizzes.find((q) => q.slug === "constantes") ?? quizzes[0];
  const items = theme.questions.slice(0, 5).map((q, i) => ({ q, picked: i % 2 ? q.answer : (q.answer + 1) % q.choices.length }));

  const steps: (() => Promise<unknown>)[] = [
    // 1. Achat numérique
    () => sendOrderEmail(env, { to, packName: pack.name, amountCents: pack.priceCents, reference, links, imagesUrl, expiresAt, idempotencyKey: key("commande") }),
    // 2. Achat papier (confirmation + adresse, numérique offert)
    () =>
      sendOrderEmail(env, {
        to,
        packName: pack.name,
        amountCents: (pack.print?.priceCents ?? 990) + 399,
        reference,
        links,
        imagesUrl,
        expiresAt,
        idempotencyKey: key("commande-papier"),
        shippingLines: address,
      }),
    // 3. Alerte « commande papier à préparer » (pour La Petite IDE)
    () =>
      sendPrintOrderNotice(env, {
        to,
        reference,
        packName: pack.name,
        amountCents: 1389,
        customerEmail: to,
        shippingLines: address,
        deliverable: true,
        adminUrl: `${base}/admin?vue=a-expedier`,
        sessionId,
      }),
    // 4. Colis expédié (numéro de suivi)
    () => sendShippedEmail(env, { to, packName: pack.name, reference, tracking: "6A12345678901", sessionId }),
    // 5. « Retrouver mon achat »
    () => sendRecoveryEmail(env, to, [{ packName: pack.name, reference, url: `${base}/retrouver-mon-achat` }], expiresAt, key("retrouver")),
    // 6. Mise à jour d'un pack
    () =>
      sendUpdateEmails(
        env,
        [{ to, packName: pack.name, links, imagesUrl, expiresAt }],
        "Exemple de message : nouvelle fiche ajoutée, valeurs précisées.",
        key("maj"),
      ),
    // 7 à 10. Emails du quiz (envoyée tout de suite pour l'aperçu, au lieu de J+2 et J+5)
    () =>
      sendEmail(env, {
        to,
        ...correctionEmail({
          themeTitle: theme.title,
          modeLabel: QUIZ_MODES.flash.label,
          items,
          freeUrl,
          packUrl: `${base}/${pack.slug}?src=email`,
          unsubscribeUrl: unsub,
          aboutPack: Boolean(theme.packSlug),
        }),
        idempotencyKey: key("quiz-1"),
        unsubscribeUrl: unsub,
      }),
    // Correction d'un quiz suivant : sans la fiche gratuite (déjà envoyée avec la première)
    () =>
      sendEmail(env, {
        to,
        ...correctionEmail({
          themeTitle: theme.title,
          modeLabel: QUIZ_MODES.pros.label,
          items,
          freeUrl: null,
          packUrl: `${base}/${pack.slug}?src=email`,
          unsubscribeUrl: unsub,
          aboutPack: Boolean(theme.packSlug),
        }),
        idempotencyKey: key("quiz-1bis"),
        unsubscribeUrl: unsub,
      }),
    () => sendEmail(env, { to, ...tipsEmail({ quizUrl: `${base}/quiz?src=email`, unsubscribeUrl: unsub }), idempotencyKey: key("quiz-2"), unsubscribeUrl: unsub }),
    () =>
      sendEmail(env, {
        to,
        ...offerEmail({ packUrl: `${base}/${pack.slug}?src=email`, sendAt: new Date(), unsubscribeUrl: unsub }),
        idempotencyKey: key("quiz-3"),
        unsubscribeUrl: unsub,
      }),
  ];

  let sent = 0;
  for (const step of steps) {
    if (sent) await pause();
    await step();
    sent++;
  }
  return sent;
}

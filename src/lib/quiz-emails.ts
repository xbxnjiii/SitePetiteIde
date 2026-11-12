import "server-only";
import { FREE_SHEET, REVISION_TIPS, SEQUENCE_DELAYS } from "@/content/lead";
import { OFFER } from "@/content/offer";
import { getPack } from "@/content/packs";
import type { QuizQuestion } from "@/content/quiz";
import { escapeHtml as esc } from "./email";
import { SITE } from "./format";

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export interface CorrectionItem {
  q: QuizQuestion;
  picked: number;
}

/** Mise en page commune (mobile d'abord). */
function layout(opts: { preheader: string; title: string; body: string; unsubscribeUrl: string }): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#F8F9FC;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FC"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px">
<tr><td style="padding:26px 22px 22px;font-family:${FONT};color:#2D3A5A">
<p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#4E7AC7">La Petite IDE</p>
<h1 style="margin:0 0 12px;font-size:22px;line-height:28px;font-weight:800">${esc(opts.title)}</h1>
${opts.body}
</td></tr></table>
<p style="max-width:480px;margin:14px auto 0;font-family:${FONT};font-size:11px;line-height:16px;color:#9AA6C2">
Tu reçois cet email car tu l'as demandé à la fin d'un quiz sur ${esc(SITE.url.replace(/^https?:\/\//, ""))}.<br>
<a href="${esc(opts.unsubscribeUrl)}" style="color:#9AA6C2">Se désinscrire en un clic</a></p>
</td></tr></table></body></html>`;
}

function button(href: string, label: string, color = "#4E7AC7") {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:6px 0 14px">
<a href="${esc(href)}" style="display:block;background:${color};color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;line-height:21px;text-align:center;padding:15px 18px;border-radius:14px;font-family:${FONT}">${esc(label)}</a>
</td></tr></table>`;
}

const p = (html: string, extra = "") =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:23px;color:#5B6784;${extra}">${html}</p>`;

/* ---------- Email de correction (avec la fiche gratuite la première fois seulement) ---------- */
export function correctionEmail(o: {
  themeTitle: string;
  modeLabel: string;
  items: CorrectionItem[];
  /** Lien de la fiche gratuite : uniquement pour la première correction (null ensuite : la fiche a déjà été envoyée). */
  freeUrl: string | null;
  packUrl: string;
  unsubscribeUrl: string;
  /** Le quiz porte sur le contenu du pack (sinon : texte d'introduction plus général). */
  aboutPack: boolean;
}) {
  const score = o.items.filter((i) => i.picked === i.q.answer).length;
  const total = o.items.length;
  // Email court : uniquement les erreurs, avec la bonne réponse et une explication d'une ligne.
  const mistakes = o.items.filter((i) => i.picked !== i.q.answer);
  const rows = mistakes
    .map(
      ({ q }) => `<tr><td style="padding:10px 0;border-top:1px solid #E3E8F2;font-family:${FONT}">
<p style="margin:0 0 3px;font-size:14px;line-height:20px;font-weight:700;color:#2D3A5A">${esc(q.question)}</p>
<p style="margin:0;font-size:13px;line-height:19px;color:#1f6b4f">✔️ ${esc(q.choices[q.answer])} <span style="color:#5B6784">· ${esc(q.explanation)}</span></p>
</td></tr>`,
    )
    .join("");
  const pack = getPack("pack-des-constantes");
  const correction = mistakes.length
    ? `<p style="margin:14px 0 2px;font-size:15px;font-weight:700">📝 Tes ${mistakes.length} erreur${mistakes.length > 1 ? "s" : ""}, corrigée${mistakes.length > 1 ? "s" : ""}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`
    : p("🏆 Sans faute : rien à corriger, bravo !", "margin-top:12px;font-weight:700;color:#1f6b4f");
  const body = `${p(`<strong style="color:#4E7AC7;font-size:18px">${score}/${total}</strong> au ${esc(o.modeLabel)} « ${esc(o.themeTitle)} ».`)}
${
    o.freeUrl
      ? button(o.freeUrl, "🎁 Télécharger ma fiche gratuite")
      : `<p style="margin:0 0 4px;padding:10px 12px;border-radius:12px;background:#F8F9FC;font-size:13px;line-height:19px;color:#5B6784">🎁 Ta fiche gratuite t'a déjà été envoyée avec ta première correction : retrouve-la dans tes emails.</p>`
  }
${correction}
${pack ? `<p style="margin:18px 0 0;font-size:14px;line-height:21px;color:#5B6784">Tout l'essentiel des constantes en ${pack.items.length} fiches : <a href="${esc(o.packUrl)}" style="color:#4E7AC7;font-weight:700">découvrir le ${esc(pack.name)}</a></p>` : ""}`;
  return {
    subject: o.freeUrl ? `Ta correction (${score}/${total}) + ta fiche gratuite 🎁` : `Ta correction : ${score}/${total} au quiz « ${o.themeTitle} » 📝`,
    html: layout({
      preheader: o.freeUrl ? "Ta fiche gratuite et la correction de tes erreurs." : "La correction de tes erreurs.",
      title: o.freeUrl ? "Ta correction + ta fiche gratuite 🎁" : "Ta correction 📝",
      body,
      unsubscribeUrl: o.unsubscribeUrl,
    }),
    text: [
      `${score}/${total} au ${o.modeLabel} « ${o.themeTitle} ».`,
      "",
      o.freeUrl ? `Ta fiche gratuite : ${o.freeUrl}` : "Ta fiche gratuite t'a déjà été envoyée avec ta première correction.",
      "",
      ...(mistakes.length
        ? ["Tes erreurs, corrigées :", ...mistakes.map(({ q }) => `- ${q.question}\n  Bonne réponse : ${q.choices[q.answer]} · ${q.explanation}`)]
        : ["Sans faute : bravo !"]),
      "",
      `Le pack : ${o.packUrl}`,
      `Se désinscrire : ${o.unsubscribeUrl}`,
    ].join("\n"),
  };
}

/* ---------- Email 2 : conseils de révision ---------- */
export function tipsEmail(o: { quizUrl: string; unsubscribeUrl: string }) {
  const tips = REVISION_TIPS.map(
    (t, i) => `<tr><td style="padding:10px 0;border-top:1px solid #E3E8F2;font-family:${FONT}">
<p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#2D3A5A">${i + 1}. ${esc(t.title)}</p>
<p style="margin:0;font-size:14px;line-height:21px;color:#5B6784">${esc(t.text)}</p></td></tr>`,
  ).join("");
  const body = `${p("Voici 3 astuces simples pour retenir tes valeurs (et ne plus les oublier le jour J) :")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tips}</table>
${p("Envie de vérifier que ça a marché ?", "margin-top:16px")}
${button(o.quizUrl, "Refaire un quiz 🏆", "#d77ba0")}`;
  return {
    subject: "3 astuces pour mieux retenir tes cours 🧠",
    html: layout({ preheader: "Réviser moins longtemps, mais retenir plus.", title: "3 astuces pour mieux retenir 🧠", body, unsubscribeUrl: o.unsubscribeUrl }),
    text: [
      "3 astuces pour retenir tes valeurs :",
      ...REVISION_TIPS.map((t, i) => `${i + 1}. ${t.title} — ${t.text}`),
      "",
      `Refaire un quiz : ${o.quizUrl}`,
      `Se désinscrire : ${o.unsubscribeUrl}`,
    ].join("\n"),
  };
}

/* ---------- Email 3 : offre du pack ---------- */
export function offerEmail(o: { packUrl: string; sendAt: Date; unsubscribeUrl: string }) {
  const pack = getPack("pack-des-constantes");
  const offerOn = OFFER.enabled && o.sendAt.getTime() < new Date(OFFER.endsAt).getTime();
  const items = pack
    ? pack.items.map((i) => `<li style="margin:0 0 4px">${esc(i.title)}</li>`).join("") + (pack.bonus ? `<li>🎁 ${esc(pack.bonus.title)}</li>` : "")
    : "";
  const body = `${p("Tu as testé tes connaissances, tu as tes astuces… il ne te manque plus que les fiches pour réviser en un clin d'œil.")}
${pack ? `<ul style="margin:0 0 14px;padding-left:20px;font-size:14px;line-height:21px;color:#2D3A5A">${items}</ul>` : ""}
${offerOn ? `<div style="margin:0 0 14px;padding:12px 14px;border-radius:12px;background:#FCF0F5;font-size:14px;line-height:21px;color:#8f3a5e"><strong>${esc(OFFER.label)}</strong> avec le code <strong>${esc(OFFER.code)}</strong>, jusqu'au ${esc(OFFER.endsLabel)}.</div>` : ""}
${button(o.packUrl, pack ? `Je découvre le ${pack.name}` : "Découvrir le pack")}
${p("PDF reçu immédiatement par email, lisible sur téléphone ou à imprimer.", "font-size:13px")}`;
  return {
    subject: pack ? `Ton ${pack.name} t'attend 💙` : "Tes fiches t'attendent 💙",
    html: layout({ preheader: "Toutes les valeurs à connaître, réunies sur des fiches ultra-visuelles.", title: "Prête à tout retenir ? 💙", body, unsubscribeUrl: o.unsubscribeUrl }),
    text: [
      pack ? `${pack.name} : ${pack.items.map((i) => i.title).join(", ")}${pack.bonus ? " + 1 fiche bonus" : ""}.` : "",
      offerOn ? `${OFFER.label} avec le code ${OFFER.code} jusqu'au ${OFFER.endsLabel}.` : "",
      `Découvrir : ${o.packUrl}`,
      `Se désinscrire : ${o.unsubscribeUrl}`,
    ].filter(Boolean).join("\n"),
  };
}

export const freeSheetDays = FREE_SHEET.days;
export const delays = SEQUENCE_DELAYS;

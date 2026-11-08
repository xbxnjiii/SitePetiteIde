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

/* ---------- Email 1 : correction détaillée + fiche gratuite ---------- */
export function correctionEmail(o: {
  themeTitle: string;
  modeLabel: string;
  items: CorrectionItem[];
  freeUrl: string;
  packUrl: string;
  unsubscribeUrl: string;
  /** Le quiz porte sur le contenu du pack (sinon : texte d'introduction plus général). */
  aboutPack: boolean;
}) {
  const score = o.items.filter((i) => i.picked === i.q.answer).length;
  const total = o.items.length;
  const rows = o.items
    .map(({ q, picked }, n) => {
      const ok = picked === q.answer;
      return `<tr><td style="padding:12px 0;border-top:1px solid #E3E8F2;font-family:${FONT}">
<p style="margin:0 0 6px;font-size:14px;line-height:20px;font-weight:700;color:#2D3A5A">${n + 1}. ${esc(q.question)}</p>
<p style="margin:0 0 4px;font-size:13px;line-height:19px;color:${ok ? "#1f6b4f" : "#8f3a5e"}">${ok ? "✅" : "❌"} Ta réponse : ${esc(q.choices[picked] ?? "—")}</p>
${ok ? "" : `<p style="margin:0 0 4px;font-size:13px;line-height:19px;color:#1f6b4f">✔️ Bonne réponse : ${esc(q.choices[q.answer])}</p>`}
<p style="margin:0;font-size:13px;line-height:19px;color:#5B6784">${esc(q.explanation)}</p>
</td></tr>`;
    })
    .join("");
  const pack = getPack("pack-des-constantes");
  const body = `${p(`Bravo d'avoir joué au <strong style="color:#2D3A5A">${esc(o.modeLabel)} « ${esc(o.themeTitle)} »</strong> : tu as eu <strong style="color:#4E7AC7">${score}/${total}</strong>.`)}
<p style="margin:0 0 8px;font-size:15px;font-weight:700">🎁 Ta fiche gratuite</p>
${button(o.freeUrl, "Télécharger ma fiche gratuite")}
<p style="margin:6px 0 4px;font-size:15px;font-weight:700">📝 Ta correction détaillée</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
${pack ? `<div style="margin-top:18px;padding:16px;border-radius:16px;background:#EEF3FB">
${p(`${o.aboutPack ? "Toutes ces valeurs sont réunies dans le" : "Pour réviser la base de toute surveillance, les constantes sont réunies dans le"} <strong style="color:#2D3A5A">${esc(pack.name)}</strong> : ${pack.items.length} fiches mémo + 1 bonus, sur ton téléphone ou à imprimer.`, "margin-bottom:10px")}
${button(o.packUrl, "Découvrir le pack")}</div>` : ""}`;
  return {
    subject: `Ta correction (${score}/${total}) + ta fiche gratuite 🎁`,
    html: layout({ preheader: "Ta correction détaillée et ta fiche mémo gratuite.", title: "Ta correction + ta fiche gratuite 🎁", body, unsubscribeUrl: o.unsubscribeUrl }),
    text: [
      `Tu as eu ${score}/${total} au ${o.modeLabel} « ${o.themeTitle} ».`,
      "",
      `Ta fiche gratuite : ${o.freeUrl}`,
      "",
      "Ta correction :",
      ...o.items.map(({ q, picked }, n) => `${n + 1}. ${q.question}\n   Ta réponse : ${q.choices[picked]} ${picked === q.answer ? "(juste)" : `— bonne réponse : ${q.choices[q.answer]}`}\n   ${q.explanation}`),
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

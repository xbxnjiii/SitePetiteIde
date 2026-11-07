import "server-only";
import { SHIPPING } from "@/content/shipping";
import { SITE, formatPrice } from "./format";
import { type AppEnv, requireVar } from "./env";
import type { DownloadLink } from "./orders";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

interface OrderEmail {
  to: string;
  packName: string;
  amountCents: number;
  reference: string;
  links: DownloadLink[];
  /** Page « Mes fiches en images » (pratique sur téléphone). */
  imagesUrl?: string | null;
  expiresAt: number;
  idempotencyKey: string;
  /** Commande papier : adresse de livraison (le PDF est offert). */
  shippingLines?: string[];
}

export function orderEmailHtml(o: Omit<OrderEmail, "to" | "idempotencyKey">): string {
  const until = new Date(o.expiresAt * 1000).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const buttons = o.links
    .map(
      (l) => `<tr><td style="padding:0 0 10px">
        <a href="${esc(l.url)}" style="display:block;background:#4E7AC7;color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;line-height:22px;text-align:center;padding:16px 20px;border-radius:14px;font-family:${font}">
          Télécharger mon PDF</a></td></tr>`,
    )
    .join("") +
    (o.imagesUrl
      ? `<tr><td style="padding:0 0 10px">
        <a href="${esc(o.imagesUrl)}" style="display:block;background:#EEF3FB;color:#3A63AB;text-decoration:none;font-weight:700;font-size:16px;line-height:22px;text-align:center;padding:15px 20px;border-radius:14px;font-family:${font}">
          📱 Voir mes fiches en images</a></td></tr>`
      : "");
  return `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>${o.shippingLines ? "Ta commande est confirmée" : `Ton ${esc(o.packName)} est prêt`}</title>
</head>
<body style="margin:0;padding:0;background:#F8F9FC;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden">${o.shippingLines ? "Tes fiches papier arrivent, et ton PDF offert est déjà prêt." : "Ton PDF est prêt à télécharger."}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FC">
<tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#ffffff;border-radius:20px">
    <tr><td style="padding:28px 22px 8px;font-family:${font};color:#2D3A5A">
      <p style="margin:0 0 18px;font-size:15px;font-weight:700;color:#4E7AC7">La Petite IDE</p>
      <h1 style="margin:0 0 10px;font-size:22px;line-height:28px;font-weight:800">Merci pour ta commande 💙</h1>
      ${
        o.shippingLines
          ? `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#5B6784">Tes fiches papier <strong style="color:#2D3A5A">${esc(o.packName)}</strong> sont en préparation. ${esc(SHIPPING.dispatch)}, en ${esc(SHIPPING.name)} : tu recevras un email avec le numéro de suivi.</p>
      <p style="margin:0 0 18px;padding:12px 14px;background:#F8F9FC;border-radius:12px;font-size:14px;line-height:21px;color:#2D3A5A"><strong>Livraison</strong><br>${o.shippingLines.map(esc).join("<br>")}</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#5B6784">En attendant, ton <strong style="color:#2D3A5A">PDF offert</strong> est déjà prêt 🎁</p>`
          : `<p style="margin:0 0 22px;font-size:16px;line-height:24px;color:#5B6784">Ton <strong style="color:#2D3A5A">${esc(o.packName)}</strong> est prêt.</p>`
      }
    </td></tr>
    <tr><td style="padding:0 22px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${buttons}</table>
    </td></tr>
    <tr><td style="padding:6px 22px 24px;font-family:${font};font-size:13px;line-height:20px;color:#5B6784">
      Liens valables jusqu'au ${until}. Pense à enregistrer tes fiches sur ton téléphone.<br>
      Lien perdu ou expiré ? <a href="${esc(SITE.url)}/retrouver-mon-achat" style="color:#4E7AC7">Retrouver mon achat</a>
    </td></tr>
    <tr><td style="padding:16px 22px 22px;border-top:1px solid #E3E8F2;font-family:${font};font-size:14px;line-height:21px;color:#2D3A5A">
      Commande ${esc(o.reference)} · ${esc(formatPrice(o.amountCents))}<br>
      <span style="color:#5B6784">Une question ? Réponds simplement à cet email.</span>
    </td></tr>
  </table>
  <p style="max-width:460px;margin:14px auto 0;font-family:${font};font-size:11px;line-height:16px;color:#9AA6C2">
    ${
      o.shippingLines
        ? `Tu disposes de 14 jours à réception des fiches papier pour exercer ton droit de rétractation (<a href="${esc(SITE.url)}/cgv" style="color:#9AA6C2">CGV</a>).
    PDF offert réservé à un usage personnel.`
        : `Tu as demandé l'accès immédiat à ce contenu numérique et renoncé à ton droit de rétractation (<a href="${esc(SITE.url)}/cgv" style="color:#9AA6C2">CGV</a>).
    Fichier réservé à un usage personnel.`
    }
  </p>
</td></tr></table>
</body></html>`;
}

export function orderEmailText(o: Omit<OrderEmail, "to" | "idempotencyKey">): string {
  const print = o.shippingLines
    ? [
        `Tes fiches papier ${o.packName} sont en préparation. ${SHIPPING.dispatch}, en ${SHIPPING.name} : tu recevras le numéro de suivi par email.`,
        "",
        "Livraison :",
        ...o.shippingLines,
        "",
        "En attendant, ton PDF offert est déjà prêt :",
      ]
    : [`Ton ${o.packName} est prêt. Télécharge-le ici :`];
  return [
    "Merci pour ta commande !",
    "",
    ...print,
    ...o.links.map((l) => `- ${l.label} : ${l.url}`),
    ...(o.imagesUrl ? [`- Mes fiches en images (pour téléphone) : ${o.imagesUrl}`] : []),
    "",
    `Commande ${o.reference} · ${formatPrice(o.amountCents)}`,
    `Lien valable ${SITE.downloadDays} jours. Une question ? Réponds à cet email.`,
    "— La Petite IDE",
    "",
    o.shippingLines
      ? "Tu disposes de 14 jours à réception des fiches papier pour exercer ton droit de rétractation (voir les CGV)."
      : "Tu as demandé l'accès immédiat à ce contenu numérique et renoncé à ton droit de rétractation.",
  ].join("\n");
}

/** Envoie l'email de livraison via l'API Resend (sans SDK). Lève une erreur en cas d'échec. */
export async function sendOrderEmail(env: AppEnv, o: OrderEmail): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireVar(env, "RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      // Resend ignore un second envoi avec la même clé (protection contre les doublons).
      "Idempotency-Key": o.idempotencyKey,
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM ?? "La Petite IDE <commandes@lapetiteide.fr>",
      to: [o.to],
      reply_to: env.EMAIL_REPLY_TO ?? SITE.contactEmail,
      subject: o.shippingLines ? `Commande confirmée : ${o.packName} (papier) 💙` : `Ton ${o.packName} est prêt 💙`,
      html: orderEmailHtml(o),
      text: orderEmailText(o),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

export interface RecoveryItem {
  /** Texte du bouton (défaut : « Télécharger · nom du pack »). */
  label?: string;
  packName: string;
  reference: string;
  url: string;
}

/** Email « Retrouver mon achat » : nouveaux liens pour toutes les commandes payées de l'adresse. */
export function recoveryEmailHtml(items: RecoveryItem[], expiresAt: number): string {
  const until = new Date(expiresAt * 1000).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const rows = items
    .map(
      (i) => `<tr><td style="padding:0 0 12px">
        <a href="${esc(i.url)}" style="display:block;background:#4E7AC7;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;line-height:21px;text-align:center;padding:15px 18px;border-radius:14px;font-family:${font}">
          ${esc(i.label ?? `Télécharger · ${i.packName}`)}</a>
        <p style="margin:6px 0 0;font-family:${font};font-size:12px;color:#9AA6C2;text-align:center">Commande ${esc(i.reference)}</p>
      </td></tr>`,
    )
    .join("");
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tes fiches La Petite IDE</title></head>
<body style="margin:0;padding:0;background:#F8F9FC">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FC">
<tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#ffffff;border-radius:20px">
    <tr><td style="padding:28px 22px 6px;font-family:${font};color:#2D3A5A">
      <p style="margin:0 0 18px;font-size:15px;font-weight:700;color:#4E7AC7">La Petite IDE</p>
      <h1 style="margin:0 0 10px;font-size:22px;line-height:28px;font-weight:800">Voici tes fiches 💙</h1>
      <p style="margin:0 0 20px;font-size:16px;line-height:24px;color:#5B6784">Tu as demandé à retrouver tes achats. Tes nouveaux liens :</p>
    </td></tr>
    <tr><td style="padding:0 22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
    <tr><td style="padding:4px 22px 24px;font-family:${font};font-size:13px;line-height:20px;color:#5B6784">
      Liens valables jusqu'au ${until}. Pense à enregistrer tes fiches.<br>
      Tu n'es pas à l'origine de cette demande ? Ignore simplement cet email.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

export async function sendRecoveryEmail(env: AppEnv, to: string, items: RecoveryItem[], expiresAt: number, idempotencyKey: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireVar(env, "RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM ?? "La Petite IDE <commandes@lapetiteide.fr>",
      to: [to],
      reply_to: env.EMAIL_REPLY_TO ?? SITE.contactEmail,
      subject: "Tes fiches La Petite IDE 💙",
      html: recoveryEmailHtml(items, expiresAt),
      text: ["Voici tes fiches :", ...items.map((i) => `- ${i.label ?? i.packName} (${i.reference}) : ${i.url}`), "", "— La Petite IDE"].join("\n"),
    }),
  });
  // 409 = même clé d'idempotence déjà utilisée (envoi déjà fait dans l'heure) : pas une erreur.
  if (!res.ok && res.status !== 409) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

// ---------------------------------------------------------------------------
//  Commandes papier : alerte « à préparer » et email d'expédition
// ---------------------------------------------------------------------------

async function sendEmail(
  env: AppEnv,
  m: { to: string; subject: string; html: string; text: string; idempotencyKey: string; replyTo?: string },
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireVar(env, "RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": m.idempotencyKey,
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM ?? "La Petite IDE <commandes@lapetiteide.fr>",
      to: [m.to],
      reply_to: m.replyTo ?? env.EMAIL_REPLY_TO ?? SITE.contactEmail,
      subject: m.subject,
      html: m.html,
      text: m.text,
    }),
  });
  // 409 = même clé d'idempotence déjà utilisée : l'email est déjà parti.
  if (!res.ok && res.status !== 409) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function simpleEmailHtml(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#F8F9FC">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FC">
<tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#ffffff;border-radius:20px">
    <tr><td style="padding:28px 22px 24px;font-family:${FONT};color:#2D3A5A;font-size:15px;line-height:23px">
      <p style="margin:0 0 18px;font-size:15px;font-weight:700;color:#4E7AC7">La Petite IDE</p>
      <h1 style="margin:0 0 14px;font-size:22px;line-height:28px;font-weight:800">${esc(title)}</h1>
      ${bodyHtml}
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

export interface PrintOrderNotice {
  reference: string;
  packName: string;
  amountCents: number;
  customerEmail: string;
  shippingLines: string[];
  deliverable: boolean;
  adminUrl: string;
  sessionId: string;
}

/** Alerte envoyée à La Petite IDE : une commande papier est à préparer. */
export async function sendPrintOrderNotice(env: AppEnv, n: PrintOrderNotice): Promise<void> {
  const warn = n.deliverable ? "" : "⚠️ Adresse hors France métropolitaine : à vérifier avant l'envoi (rembourser si besoin).";
  const html = simpleEmailHtml(
    `📦 Commande papier ${n.reference}`,
    `<p style="margin:0 0 12px"><strong>${esc(n.packName)}</strong> · ${esc(formatPrice(n.amountCents))}</p>
      ${warn ? `<p style="margin:0 0 12px;padding:10px 12px;background:#FCEFF4;border-radius:10px;color:#9B3A63">${esc(warn)}</p>` : ""}
      <p style="margin:0 0 12px;padding:12px 14px;background:#F8F9FC;border-radius:12px">${n.shippingLines.map(esc).join("<br>")}</p>
      <p style="margin:0 0 18px">Client : <a href="mailto:${esc(n.customerEmail)}" style="color:#4E7AC7">${esc(n.customerEmail)}</a></p>
      <a href="${esc(n.adminUrl)}" style="display:block;background:#4E7AC7;color:#ffffff;text-decoration:none;font-weight:700;text-align:center;padding:14px 18px;border-radius:14px">Voir les commandes à expédier</a>`,
  );
  const text = [
    `Commande papier ${n.reference} — ${n.packName} · ${formatPrice(n.amountCents)}`,
    ...(warn ? ["", warn] : []),
    "",
    ...n.shippingLines,
    "",
    `Client : ${n.customerEmail}`,
    `Commandes à expédier : ${n.adminUrl}`,
  ].join("\n");
  await sendEmail(env, {
    to: env.ORDERS_NOTIFY_TO ?? env.EMAIL_REPLY_TO ?? SITE.contactEmail,
    replyTo: n.customerEmail,
    subject: `${n.deliverable ? "📦" : "⚠️"} Commande papier à préparer · ${n.reference}`,
    html,
    text,
    idempotencyKey: `print-notice-${n.sessionId}`,
  });
}

/** Email au client : ses fiches papier sont parties (avec le numéro de suivi). */
export async function sendShippedEmail(
  env: AppEnv,
  s: { to: string; packName: string; reference: string; tracking: string; sessionId: string },
): Promise<void> {
  const trackUrl = `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(s.tracking)}`;
  const html = simpleEmailHtml(
    "Tes fiches sont en route 📦",
    `<p style="margin:0 0 14px;color:#5B6784">Bonne nouvelle : tes fiches papier <strong style="color:#2D3A5A">${esc(s.packName)}</strong> viennent d'être expédiées.</p>
      <p style="margin:0 0 18px">Numéro de suivi : <strong>${esc(s.tracking)}</strong></p>
      <a href="${esc(trackUrl)}" style="display:block;background:#4E7AC7;color:#ffffff;text-decoration:none;font-weight:700;text-align:center;padding:14px 18px;border-radius:14px">Suivre mon colis</a>
      <p style="margin:18px 0 0;font-size:13px;line-height:20px;color:#5B6784">Commande ${esc(s.reference)} · Une question ? Réponds simplement à cet email.</p>`,
  );
  const text = [
    `Tes fiches papier ${s.packName} viennent d'être expédiées.`,
    `Numéro de suivi : ${s.tracking}`,
    `Suivre mon colis : ${trackUrl}`,
    "",
    `Commande ${s.reference} — Une question ? Réponds à cet email.`,
    "— La Petite IDE",
  ].join("\n");
  await sendEmail(env, {
    to: s.to,
    subject: `Tes fiches ${s.packName} sont en route 📦`,
    html,
    text,
    idempotencyKey: `shipped-${s.sessionId}-${s.tracking}`,
  });
}

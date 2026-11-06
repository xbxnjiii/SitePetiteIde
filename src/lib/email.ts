import "server-only";
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
  expiresAt: number;
  idempotencyKey: string;
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
    .join("");
  return `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>Ton ${esc(o.packName)} est prêt</title>
</head>
<body style="margin:0;padding:0;background:#F8F9FC;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden">Ton PDF est prêt à télécharger.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FC">
<tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#ffffff;border-radius:20px">
    <tr><td style="padding:28px 22px 8px;font-family:${font};color:#2D3A5A">
      <p style="margin:0 0 18px;font-size:15px;font-weight:700;color:#4E7AC7">La Petite IDE</p>
      <h1 style="margin:0 0 10px;font-size:22px;line-height:28px;font-weight:800">Merci pour ta commande 💙</h1>
      <p style="margin:0 0 22px;font-size:16px;line-height:24px;color:#5B6784">Ton <strong style="color:#2D3A5A">${esc(o.packName)}</strong> est prêt.</p>
    </td></tr>
    <tr><td style="padding:0 22px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${buttons}</table>
    </td></tr>
    <tr><td style="padding:6px 22px 24px;font-family:${font};font-size:13px;line-height:20px;color:#5B6784">
      Lien valable jusqu'au ${until}. Pense à enregistrer le PDF sur ton téléphone.<br>
      Lien perdu ou expiré ? <a href="${esc(SITE.url)}/retrouver-mon-achat" style="color:#4E7AC7">Retrouver mon achat</a>
    </td></tr>
    <tr><td style="padding:16px 22px 22px;border-top:1px solid #E3E8F2;font-family:${font};font-size:14px;line-height:21px;color:#2D3A5A">
      Commande ${esc(o.reference)} · ${esc(formatPrice(o.amountCents))}<br>
      <span style="color:#5B6784">Une question ? Réponds simplement à cet email.</span>
    </td></tr>
  </table>
  <p style="max-width:460px;margin:14px auto 0;font-family:${font};font-size:11px;line-height:16px;color:#9AA6C2">
    Tu as demandé l'accès immédiat à ce contenu numérique et renoncé à ton droit de rétractation (<a href="${esc(SITE.url)}/cgv" style="color:#9AA6C2">CGV</a>).
    Fichier réservé à un usage personnel.
  </p>
</td></tr></table>
</body></html>`;
}

export function orderEmailText(o: Omit<OrderEmail, "to" | "idempotencyKey">): string {
  return [
    "Merci pour ta commande !",
    "",
    `Ton ${o.packName} est prêt. Télécharge-le ici :`,
    ...o.links.map((l) => `- ${l.label} : ${l.url}`),
    "",
    `Commande ${o.reference} · ${formatPrice(o.amountCents)}`,
    `Lien valable ${SITE.downloadDays} jours. Une question ? Réponds à cet email.`,
    "— La Petite IDE",
    "",
    "Tu as demandé l'accès immédiat à ce contenu numérique et renoncé à ton droit de rétractation.",
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
      subject: `Ton ${o.packName} est prêt 💙`,
      html: orderEmailHtml(o),
      text: orderEmailText(o),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

export interface RecoveryItem {
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
          Télécharger · ${esc(i.packName)}</a>
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
      Liens valables jusqu'au ${until}. Pense à enregistrer tes PDF.<br>
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
      text: ["Voici tes fiches :", ...items.map((i) => `- ${i.packName} (${i.reference}) : ${i.url}`), "", "— La Petite IDE"].join("\n"),
    }),
  });
  // 409 = même clé d'idempotence déjà utilisée (envoi déjà fait dans l'heure) : pas une erreur.
  if (!res.ok && res.status !== 409) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

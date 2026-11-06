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
  const buttons = o.links
    .map(
      (l) => `<tr><td style="padding:6px 0">
        <a href="${esc(l.url)}" style="display:inline-block;background:#4E7AC7;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px;font-family:Arial,sans-serif">
          Télécharger · ${esc(l.label)}</a></td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F8F9FC;font-family:Arial,Helvetica,sans-serif;color:#2D3A5A">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FC;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;padding:28px">
    <tr><td style="font-size:20px;font-weight:700;color:#4E7AC7;padding-bottom:16px">La Petite IDE</td></tr>
    <tr><td style="font-size:22px;font-weight:700;padding-bottom:8px">Merci pour ta commande ! 💙</td></tr>
    <tr><td style="font-size:15px;line-height:1.6;padding-bottom:16px">
      Ton <strong>${esc(o.packName)}</strong> est prêt. Clique sur le bouton ci-dessous pour le télécharger :</td></tr>
    ${buttons}
    <tr><td style="font-size:13px;line-height:1.6;color:#5B6784;padding-top:16px">
      Lien personnel, valable jusqu'au ${until}. Astuce : si le téléchargement ne démarre pas depuis TikTok ou Instagram,
      ouvre cet email dans l'application Mail ou dans ton navigateur.</td></tr>
    <tr><td style="border-top:1px solid #E3E8F2;margin-top:16px;padding-top:16px;font-size:13px;line-height:1.6;color:#5B6784">
      Commande <strong>${esc(o.reference)}</strong> · ${esc(formatPrice(o.amountCents))}<br>
      Tu as demandé l'accès immédiat au contenu numérique et renoncé à ton droit de rétractation (CGV : ${esc(SITE.url)}/cgv).<br>
      Une question ? Réponds simplement à cet email.</td></tr>
  </table>
  <p style="font-size:12px;color:#9AA6C2">Fichiers réservés à un usage personnel — merci de ne pas les partager.</p>
  </td></tr></table></body></html>`;
}

export function orderEmailText(o: Omit<OrderEmail, "to" | "idempotencyKey">): string {
  return [
    "Merci pour ta commande !",
    "",
    `Ton ${o.packName} est prêt. Télécharge-le ici :`,
    ...o.links.map((l) => `- ${l.label} : ${l.url}`),
    "",
    `Commande ${o.reference} · ${formatPrice(o.amountCents)}`,
    `Lien personnel valable ${SITE.downloadDays} jours. Une question ? Réponds à cet email.`,
    "— La Petite IDE",
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
      subject: `Ton ${o.packName} est prêt à télécharger 📚`,
      html: orderEmailHtml(o),
      text: orderEmailText(o),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

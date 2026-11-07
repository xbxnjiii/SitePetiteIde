import type Stripe from "stripe";
import { getPack } from "@/content/packs";
import { sendShippedEmail } from "@/lib/email";
import { type AppEnv, getEnvAsync, siteUrl } from "@/lib/env";
import { formatPrice } from "@/lib/format";
import { orderReference, shippingInfo } from "@/lib/orders";
import { isAllowedOrigin } from "@/lib/origin";
import { stripeClient } from "@/lib/stripe";

// /admin — commandes papier à expédier (protégé par mot de passe : secret ADMIN_PASSWORD).
//  GET  : liste des commandes papier payées (à expédier / expédiées).
//  POST : {session_id, tracking} → marque la commande expédiée et envoie le numéro de suivi au client.
// Aucune base de données : l'état « expédiée » est enregistré sur le paiement Stripe (métadonnées).
export const dynamic = "force-dynamic";

const SHIPPED_AT = "lpi_expedie_le";
const TRACKING = "lpi_suivi";

export async function GET(request: Request) {
  const env = await getEnvAsync();
  const denied = await checkAuth(request, env);
  if (denied) return denied;

  const url = new URL(request.url);
  const notice = url.searchParams.get("ok") ? "Commande marquée expédiée, email de suivi envoyé ✅" : null;
  const error = url.searchParams.get("erreur");

  let orders: AdminOrder[] = [];
  let loadError: string | null = null;
  try {
    orders = await listPrintOrders(stripeClient(env));
  } catch (err) {
    console.error("admin:", err instanceof Error ? err.message : err);
    loadError = "Impossible de charger les commandes depuis Stripe. Réessaie dans un instant.";
  }
  return html(page(orders, { notice, error: loadError ?? (error ? errorMessage(error) : null) }));
}

export async function POST(request: Request) {
  const env = await getEnvAsync();
  const denied = await checkAuth(request, env);
  if (denied) return denied;
  const base = siteUrl(env);
  // Le formulaire doit venir de cette page (le navigateur renvoie le mot de passe automatiquement).
  const origin = request.headers.get("origin");
  if (!origin || !isAllowedOrigin(origin, base)) return new Response("Origine non autorisée", { status: 403 });

  const form = await request.formData().catch(() => null);
  const sessionId = String(form?.get("session_id") ?? "");
  const tracking = String(form?.get("tracking") ?? "").replace(/\s+/g, "").toUpperCase();
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) return Response.redirect(`${base}/admin?erreur=session`, 303);
  if (!/^[A-Z0-9]{8,30}$/.test(tracking)) return Response.redirect(`${base}/admin?erreur=suivi`, 303);

  try {
    const stripe = stripeClient(env);
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
    const pi = session.payment_intent as Stripe.PaymentIntent | null;
    const email = session.customer_details?.email;
    const pack = getPack(session.metadata?.pack ?? "");
    if (session.metadata?.format !== "papier" || session.status !== "complete" || !pi || !email || !pack) {
      return Response.redirect(`${base}/admin?erreur=session`, 303);
    }
    await sendShippedEmail(env, {
      to: email,
      packName: pack.name,
      reference: orderReference(session.id),
      tracking,
      sessionId: session.id,
    });
    await stripe.paymentIntents.update(pi.id, { metadata: { [SHIPPED_AT]: new Date().toISOString(), [TRACKING]: tracking } });
    console.log("admin: commande expédiée", orderReference(session.id));
    return Response.redirect(`${base}/admin?ok=1`, 303);
  } catch (err) {
    console.error("admin: expédition", err instanceof Error ? err.message : err);
    return Response.redirect(`${base}/admin?erreur=envoi`, 303);
  }
}

// ---------------------------------------------------------------------------

interface AdminOrder {
  id: string;
  reference: string;
  createdAt: number;
  packName: string;
  amountCents: number;
  email: string;
  lines: string[];
  deliverable: boolean;
  shippedAt: string | null;
  tracking: string | null;
  refunded: boolean;
}

async function listPrintOrders(stripe: Stripe): Promise<AdminOrder[]> {
  // Les 100 dernières commandes payées (suffisant pour le volume actuel).
  const { data } = await stripe.checkout.sessions.list({
    status: "complete",
    limit: 100,
    expand: ["data.payment_intent.latest_charge"],
  });
  return data
    .filter((s) => s.metadata?.format === "papier" && (s.payment_status === "paid" || s.payment_status === "no_payment_required"))
    .map((s) => {
      const pi = s.payment_intent as Stripe.PaymentIntent | null;
      const charge = (pi?.latest_charge ?? null) as Stripe.Charge | null;
      const ship = shippingInfo(s);
      return {
        id: s.id,
        reference: orderReference(s.id),
        createdAt: s.created,
        packName: getPack(s.metadata?.pack ?? "")?.name ?? s.metadata?.pack ?? "?",
        amountCents: s.amount_total ?? 0,
        email: s.customer_details?.email ?? "",
        lines: ship?.lines ?? ["⚠️ Adresse absente : voir Stripe"],
        deliverable: ship?.deliverable ?? false,
        shippedAt: pi?.metadata?.[SHIPPED_AT] ?? null,
        tracking: pi?.metadata?.[TRACKING] ?? null,
        refunded: Boolean(charge?.refunded),
      };
    });
}

/** Authentification HTTP « Basic » : n'importe quel identifiant, mot de passe = ADMIN_PASSWORD. */
async function checkAuth(request: Request, env: AppEnv): Promise<Response | null> {
  const expected = env.ADMIN_PASSWORD;
  if (!expected || expected.length < 12) return new Response("Page fermée : définir le secret ADMIN_PASSWORD (12 caractères minimum).", { status: 503 });
  const header = request.headers.get("authorization") ?? "";
  let given = "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      given = decoded.slice(decoded.indexOf(":") + 1);
    } catch {}
  }
  if (await sameSecret(given, expected)) return null;
  return new Response("Accès réservé", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="La Petite IDE - admin", charset="UTF-8"', "Cache-Control": "no-store" },
  });
}

/** Comparaison en temps constant (via empreintes SHA-256). */
async function sameSecret(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const ua = new Uint8Array(x);
  const ub = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

const errorMessage = (code: string) =>
  ({
    suivi: "Numéro de suivi invalide (8 à 30 lettres ou chiffres).",
    session: "Commande introuvable.",
    envoi: "L'email de suivi n'a pas pu être envoyé. Réessaie.",
  })[code] ?? "Une erreur est survenue.";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const date = (unix: number) =>
  new Date(unix * 1000).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

function html(body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "same-origin",
    },
  });
}

function card(o: AdminOrder): string {
  const address = o.lines.map(esc).join("<br>");
  const flags = [
    o.refunded ? `<span class="tag tag--warn">Remboursée</span>` : "",
    o.deliverable ? "" : `<span class="tag tag--warn">Hors métropole ?</span>`,
  ].join("");
  const action = o.shippedAt
    ? `<p class="muted">Expédiée le ${esc(new Date(o.shippedAt).toLocaleDateString("fr-FR"))} · suivi <strong>${esc(o.tracking ?? "")}</strong></p>`
    : o.refunded
      ? `<p class="muted">Remboursée : ne pas expédier.</p>`
      : `<form method="post" class="ship">
          <input type="hidden" name="session_id" value="${esc(o.id)}">
          <input name="tracking" required minlength="8" maxlength="40" placeholder="N° de suivi" autocomplete="off" autocapitalize="characters" aria-label="Numéro de suivi">
          <button type="submit">Marquer expédiée</button>
        </form>`;
  return `<article class="order">
    <header><strong>${esc(o.reference)}</strong><span class="muted">${esc(date(o.createdAt))}</span></header>
    <p>${esc(o.packName)} · ${esc(formatPrice(o.amountCents))} ${flags}</p>
    <div class="addr" data-copy="${esc(o.lines.join("\n"))}">${address}</div>
    <p class="muted"><a href="mailto:${esc(o.email)}">${esc(o.email)}</a> · <button type="button" class="link" data-copy-btn>Copier l'adresse</button></p>
    ${action}
  </article>`;
}

function page(orders: AdminOrder[], msg: { notice: string | null; error: string | null }): string {
  const todo = orders.filter((o) => !o.shippedAt && !o.refunded);
  const done = orders.filter((o) => o.shippedAt || o.refunded).slice(0, 20);
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Commandes papier · La Petite IDE</title>
<style>
  :root { --p:#4E7AC7; --ink:#2D3A5A; --soft:#5B6784; --line:#E3E8F2; --bg:#F8F9FC; --warn:#C9668F; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 Inter,-apple-system,"Segoe UI",Roboto,sans-serif; }
  main { max-width:640px; margin:0 auto; padding:24px 16px 48px; }
  h1 { font-size:1.4rem; margin:0 0 4px; } h2 { font-size:1.05rem; margin:28px 0 10px; }
  .muted { color:var(--soft); font-size:.86rem; margin:6px 0 0; }
  .order { background:#fff; border:1px solid var(--line); border-radius:16px; padding:14px 16px; margin-bottom:12px; }
  .order header { display:flex; justify-content:space-between; gap:8px; }
  .order p { margin:6px 0 0; }
  .addr { margin-top:10px; padding:10px 12px; background:var(--bg); border-radius:10px; font-size:.95rem; }
  .tag { display:inline-block; font-size:.75rem; font-weight:600; padding:1px 8px; border-radius:99px; background:#FCF0F5; color:#9B3A63; margin-left:4px; }
  .ship { display:flex; gap:8px; margin-top:12px; }
  .ship input { flex:1; min-width:0; padding:10px 12px; border:1.5px solid var(--line); border-radius:12px; font:inherit; text-transform:uppercase; }
  .ship input:focus { outline:none; border-color:var(--p); }
  button { font:inherit; cursor:pointer; }
  .ship button { padding:10px 14px; border:0; border-radius:12px; background:var(--p); color:#fff; font-weight:700; white-space:nowrap; }
  .link { border:0; background:none; padding:0; color:var(--p); font-size:inherit; }
  a { color:var(--p); }
  .msg { padding:10px 14px; border-radius:12px; margin:14px 0 0; }
  .msg--ok { background:#E8F5EF; color:#1F6B4F; } .msg--err { background:#FCF0F5; color:#9B3A63; }
  .empty { background:#fff; border:1px dashed var(--line); border-radius:16px; padding:18px; text-align:center; color:var(--soft); }
</style></head>
<body><main>
  <h1>📦 Commandes papier</h1>
  <p class="muted">${todo.length} à expédier · <a href="/admin">Actualiser</a> · <a href="https://dashboard.stripe.com/payments" rel="noreferrer">Stripe</a></p>
  ${msg.notice ? `<p class="msg msg--ok">${esc(msg.notice)}</p>` : ""}
  ${msg.error ? `<p class="msg msg--err">${esc(msg.error)}</p>` : ""}
  <h2>À expédier</h2>
  ${todo.length ? todo.map(card).join("") : `<p class="empty">Rien à expédier pour le moment 🎉</p>`}
  ${done.length ? `<h2>Déjà traitées</h2>${done.map(card).join("")}` : ""}
</main>
<script>
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy-btn]"); if (!b) return;
    var t = b.closest(".order").querySelector("[data-copy]").getAttribute("data-copy");
    navigator.clipboard.writeText(t).then(function () { b.textContent = "Adresse copiée ✓"; });
  });
</script>
</body></html>`;
}

import type Stripe from "stripe";
import { getPack } from "@/content/packs";
import { sendShippedEmail } from "@/lib/email";
import { type AppEnv, getEnvAsync, siteUrl } from "@/lib/env";
import { orderReference } from "@/lib/orders";
import { isAllowedOrigin } from "@/lib/origin";
import { stripeClient } from "@/lib/stripe";
import { type AdminOrder, SHIPPED_AT, TRACKING, computeStats, listOrders, matches, statusOf } from "./data";
import { TABS, type Tab, adminPage, labelsPage } from "./view";

// /admin — suivi des commandes (protégé par mot de passe : secret ADMIN_PASSWORD).
//  GET  ?vue=a-expedier|expediees|ventes&q=…   → liste des commandes
//  GET  ?etiquettes=cs_…,cs_…                  → étiquettes d'adresse à imprimer
//  POST action=expedier {session_id, tracking} → marque expédiée + email de suivi au client
//  POST action=annuler  {session_id}           → remet la commande « à expédier » (sans email)
// Aucune base de données : l'état « expédiée » est enregistré sur le paiement Stripe (métadonnées).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const env = await getEnvAsync();
  const denied = await checkAuth(request, env);
  if (denied) return denied;

  const url = new URL(request.url);
  const labelIds = url.searchParams.get("etiquettes");
  const tab = parseTab(url.searchParams.get("vue"));
  const q = (url.searchParams.get("q") ?? "").slice(0, 100);

  let orders: AdminOrder[] = [];
  let loadError: string | null = null;
  try {
    orders = await listOrders(stripeClient(env));
  } catch (err) {
    console.error("admin:", err instanceof Error ? err.message : err);
    loadError = "Impossible de charger les commandes depuis Stripe. Réessaie dans un instant.";
  }

  if (labelIds !== null) {
    const ids = new Set(labelIds.split(","));
    return html(labelsPage(orders.filter((o) => ids.has(o.id) && o.format === "papier")));
  }

  const inTab: Record<Tab, (o: AdminOrder) => boolean> = {
    "a-expedier": (o) => ["todo", "late"].includes(statusOf(o)),
    expediees: (o) => o.format === "papier" && Boolean(o.shippedAt),
    ventes: () => true,
  };
  const found = orders.filter((o) => matches(o, q));
  const counts = Object.fromEntries(TABS.map((t) => [t.id, found.filter(inTab[t.id]).length])) as Record<Tab, number>;
  let list = found.filter(inTab[tab]);
  // À expédier : les plus anciennes d'abord (premières arrivées, premières servies).
  if (tab === "a-expedier") list = list.sort((a, b) => a.createdAt - b.createdAt);
  if (tab === "expediees") list = list.sort((a, b) => Date.parse(b.shippedAt!) - Date.parse(a.shippedAt!));

  const ok = url.searchParams.get("ok");
  const error = url.searchParams.get("erreur");
  return html(
    adminPage({
      orders: list,
      stats: loadError ? null : computeStats(orders),
      tab,
      q,
      counts,
      notice: ok === "expediee" ? "Commande marquée expédiée, email de suivi envoyé ✅" : ok === "annulee" ? "Commande remise dans « À expédier »." : null,
      error: loadError ?? (error ? errorMessage(error) : null),
    }),
  );
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
  const action = String(form?.get("action") ?? "expedier");
  const sessionId = String(form?.get("session_id") ?? "");
  const tab = parseTab(String(form?.get("vue") ?? ""));
  const q = String(form?.get("q") ?? "").slice(0, 100);
  const back = (params: string) => Response.redirect(`${base}/admin?vue=${tab}${q ? `&q=${encodeURIComponent(q)}` : ""}&${params}`, 303);

  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) return back("erreur=session");
  const tracking = String(form?.get("tracking") ?? "").replace(/\s+/g, "").toUpperCase();
  if (action === "expedier" && !/^[A-Z0-9]{8,30}$/.test(tracking)) return back("erreur=suivi");

  try {
    const stripe = stripeClient(env);
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
    const pi = session.payment_intent as Stripe.PaymentIntent | null;
    const email = session.customer_details?.email;
    const pack = getPack(session.metadata?.pack ?? "");
    if (session.metadata?.format !== "papier" || session.status !== "complete" || !pi || !email || !pack) return back("erreur=session");

    if (action === "annuler") {
      await stripe.paymentIntents.update(pi.id, { metadata: { [SHIPPED_AT]: "", [TRACKING]: "" } });
      console.log("admin: expédition annulée", orderReference(session.id));
      return back("ok=annulee");
    }

    await sendShippedEmail(env, { to: email, packName: pack.name, reference: orderReference(session.id), tracking, sessionId: session.id });
    await stripe.paymentIntents.update(pi.id, { metadata: { [SHIPPED_AT]: new Date().toISOString(), [TRACKING]: tracking } });
    console.log("admin: commande expédiée", orderReference(session.id));
    return back("ok=expediee");
  } catch (err) {
    console.error("admin:", action, err instanceof Error ? err.message : err);
    return back(action === "annuler" ? "erreur=stripe" : "erreur=envoi");
  }
}

const parseTab = (v: string | null): Tab => (TABS.some((t) => t.id === v) ? (v as Tab) : "a-expedier");

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
    stripe: "Stripe n'a pas répondu. Réessaie.",
  })[code] ?? "Une erreur est survenue.";

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

import type Stripe from "stripe";
import { getPack } from "@/content/packs";
import { publishedPacks } from "@/content/packs";
import { sendShippedEmail, sendUpdateEmails } from "@/lib/email";
import { SITE } from "@/lib/format";
import { type AppEnv, getEnvAsync, siteUrl } from "@/lib/env";
import { downloadLinks, imagesLink, orderReference } from "@/lib/orders";
import { isAllowedOrigin } from "@/lib/origin";
import { stripeClient } from "@/lib/stripe";
import { type AdminOrder, SHIPPED_AT, TRACKING, computeStats, listOrders, listOrdersBetween, listPackBuyers, matches, statusOf } from "./data";
import { lastMonths, monthBounds, ordersCsv } from "./export";
import { applySettings, getSettings, saveSettings } from "@/lib/settings";
import { cancelEmails, listEmails } from "./emails";
import { type EmailsView, TABS, type Tab, adminPage, labelsPage } from "./view";

// /admin — suivi des commandes (protégé par mot de passe : secret ADMIN_PASSWORD).
//  GET  ?vue=a-expedier|expediees|ventes&q=…   → liste des commandes
//  GET  ?etiquettes=cs_…,cs_…                  → étiquettes d'adresse à imprimer
//  POST action=expedier {session_id, tracking} → marque expédiée + email de suivi au client
//  POST action=annuler  {session_id}           → remet la commande « à expédier » (sans email)
//  GET  ?export=AAAA-MM                        → export comptable du mois (CSV)
//  POST action=maj {pack, message, test}       → nouvelle version envoyée à tous les acheteurs du pack
//  GET  ?vue=emails&f=programmes|tous|annules  → emails Resend (programmés, envoyés, annulés)
//  POST action=annuler-email {email_id} / annuler-contact {to} → annule des envois programmés
//  GET  ?vue=reglages · POST action=reglage {cle, valeur, pack} → interrupteurs (papier, emails du quiz)
// Aucune base de données : l'état « expédiée » est enregistré sur le paiement Stripe (métadonnées).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const env = await getEnvAsync();
  const denied = await checkAuth(request, env);
  if (denied) return denied;

  const url = new URL(request.url);
  const labelIds = url.searchParams.get("etiquettes");
  const exportMonth = url.searchParams.get("export");
  if (exportMonth !== null) return exportCsv(env, exportMonth);
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
    emails: () => false,
    reglages: () => false,
    outils: () => false,
  };
  const found = orders.filter((o) => matches(o, q));
  const counts = Object.fromEntries(TABS.map((t) => [t.id, found.filter(inTab[t.id]).length])) as Record<Tab, number>;
  let list = found.filter(inTab[tab]);
  // À expédier : les plus anciennes d'abord (premières arrivées, premières servies).
  if (tab === "a-expedier") list = list.sort((a, b) => a.createdAt - b.createdAt);
  if (tab === "expediees") list = list.sort((a, b) => Date.parse(b.shippedAt!) - Date.parse(a.shippedAt!));

  const ok = url.searchParams.get("ok");
  const error = url.searchParams.get("erreur");

  const settings = tab === "reglages" ? await getSettings(env) : null;
  const emails: EmailsView | undefined =
    tab === "emails"
      ? {
          ...(await listEmails(env)),
          filter: (["programmes", "tous", "annules"] as const).find((f) => f === url.searchParams.get("f")) ?? "programmes",
          q,
        }
      : undefined;
  return html(
    adminPage({
      orders: list,
      stats: loadError ? null : computeStats(orders),
      tab,
      q,
      counts,
      notice: noticeFor(ok, url.searchParams.get("n")),
      tools: { packs: publishedPacks().map((p) => ({ slug: p.slug, name: p.name })), months: lastMonths(), testTo: notifyTo(env) },
      error: loadError ?? (error ? errorMessage(error) : null),
      emails,
      settings: settings
        ? {
            print: publishedPacks()
              .filter((p) => p.print)
              .map((p) => ({ slug: p.slug, name: p.name, on: Boolean(applySettings(p, settings).print) })),
            quizEmails: settings.quizEmails,
          }
        : undefined,
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

  if (action === "maj") return sendUpdate(env, form, back);
  if (action === "reglage") return updateSetting(env, form, back);
  if (action === "annuler-email" || action === "annuler-contact") {
    const f = String(form?.get("f") ?? "programmes");
    const backEmails = (params: string) =>
      Response.redirect(`${base}/admin?vue=emails&f=${encodeURIComponent(f)}${q ? `&q=${encodeURIComponent(q)}` : ""}&${params}`, 303);
    let ids: string[] = [];
    if (action === "annuler-email") {
      const id = String(form?.get("email_id") ?? "");
      if (/^[0-9a-f-]{20,64}$/i.test(id)) ids = [id];
    } else {
      const to = String(form?.get("to") ?? "").toLowerCase();
      const { emails } = await listEmails(env);
      ids = emails.filter((e) => e.last_event === "scheduled" && e.to.some((t) => t.toLowerCase() === to)).map((e) => e.id);
    }
    if (!ids.length) return backEmails("erreur=email");
    const failed = await cancelEmails(env, ids);
    console.log("admin: envois annulés", ids.length - failed, failed ? `(${failed} échec)` : "");
    return backEmails(failed ? "erreur=annulation" : `ok=emails-annules&n=${ids.length}`);
  }

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

const notifyTo = (env: AppEnv) => env.ORDERS_NOTIFY_TO ?? env.EMAIL_REPLY_TO ?? SITE.contactEmail;

function noticeFor(ok: string | null, n: string | null): string | null {
  if (ok === "expediee") return "Commande marquée expédiée, email de suivi envoyé ✅";
  if (ok === "annulee") return "Commande remise dans « À expédier ».";
  if (ok === "maj") return `Mise à jour envoyée à ${Number(n) || 0} acheteur(s) ✅`;
  if (ok === "emails-annules") return `${Number(n) || 0} envoi(s) programmé(s) annulé(s) ✅`;
  if (ok === "reglage") return "Réglage enregistré ✅ (visible sur le site en moins d'une minute)";
  if (ok === "maj-test") return "Email de test envoyé : vérifie ta boîte avant l'envoi à tous.";
  return null;
}

/** Export comptable d'un mois : toutes les commandes payées, avec totaux. */
async function exportCsv(env: AppEnv, month: string): Promise<Response> {
  const bounds = monthBounds(month);
  if (!bounds) return new Response("Mois invalide (format AAAA-MM)", { status: 400 });
  try {
    const orders = await listOrdersBetween(stripeClient(env), bounds.from, bounds.to);
    return new Response(ordersCsv(orders), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="la-petite-ide-recettes-${month}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("admin: export", err instanceof Error ? err.message : err);
    return new Response("Export impossible : Stripe n'a pas répondu. Réessaie.", { status: 503 });
  }
}

/** Mise à jour d'un pack : nouveaux liens (PDF + images) à tous les acheteurs, ou un test à La Petite IDE. */
async function sendUpdate(env: AppEnv, form: FormData | null, back: (params: string) => Response): Promise<Response> {
  const slug = String(form?.get("pack") ?? "");
  const message = String(form?.get("message") ?? "").trim().slice(0, 1000);
  const test = form?.get("test") === "on";
  if (!publishedPacks().some((p) => p.slug === slug)) return back("erreur=pack");
  try {
    const buyers = await listPackBuyers(stripeClient(env), slug);
    if (!buyers.length) return back("erreur=acheteurs");
    const expiresAt = Math.floor(Date.now() / 1000) + SITE.downloadDays * 24 * 3600;
    const targets = test ? buyers.slice(0, 1) : buyers;
    const recipients = await Promise.all(
      targets.map(async (o) => ({
        to: test ? notifyTo(env) : o.email!,
        packName: o.pack!.name,
        links: await downloadLinks(env, o, expiresAt),
        imagesUrl: await imagesLink(env, o, expiresAt),
        expiresAt,
      })),
    );
    // Clé d'envoi : le même envoi (pack + message, même jour) n'est jamais envoyé deux fois.
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${slug}|${message}|${new Date().toISOString().slice(0, 10)}`));
    const key = Array.from(new Uint8Array(digest).slice(0, 10), (b) => b.toString(16).padStart(2, "0")).join("");
    const sent = await sendUpdateEmails(env, recipients, message, test ? `maj-test-${key}-${Date.now()}` : `maj-${key}`);
    console.log("admin: mise à jour envoyée", slug, test ? "(test)" : sent);
    return back(test ? "ok=maj-test" : `ok=maj&n=${sent}`);
  } catch (err) {
    console.error("admin: mise à jour", err instanceof Error ? err.message : err);
    return back("erreur=maj");
  }
}

/** Interrupteur de l'onglet Réglages (enregistré dans R2, voir src/lib/settings.ts). */
async function updateSetting(env: AppEnv, form: FormData | null, back: (params: string) => Response): Promise<Response> {
  const key = String(form?.get("cle") ?? "");
  const on = form?.get("valeur") === "1";
  try {
    const current = await getSettings(env);
    const next = { ...current, print: { ...current.print } };
    if (key === "papier") {
      const slug = String(form?.get("pack") ?? "");
      if (!publishedPacks().some((p) => p.slug === slug && p.print)) return back("erreur=pack");
      next.print[slug] = on;
    } else if (key === "quiz-emails") {
      next.quizEmails = on;
    } else return back("erreur=reglage");
    await saveSettings(env, next);
    console.log("admin: réglage", key, form?.get("pack") ?? "", on ? "activé" : "désactivé");
    return back("ok=reglage");
  } catch (err) {
    console.error("admin: réglage", err instanceof Error ? err.message : err);
    return back("erreur=reglage");
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
    pack: "Pack introuvable.",
    acheteurs: "Aucun acheteur pour ce pack pour le moment.",
    email: "Email introuvable ou déjà parti.",
    annulation: "Resend n'a pas pu annuler l'envoi (déjà parti ?). Actualise la page.",
    reglage: "Le réglage n'a pas pu être enregistré. Réessaie.",
    maj: "L'envoi de la mise à jour a échoué. Réessaie (les emails déjà partis ne seront pas renvoyés).",
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

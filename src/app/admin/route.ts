import type Stripe from "stripe";
import { getPack } from "@/content/packs";
import { publishedPacks } from "@/content/packs";
import { sendShippedEmail, sendUpdateEmails } from "@/lib/email";
import { IS_LIVE, IS_PREPROD, SITE, TEST_FEATURES } from "@/lib/format";
import { OFFER, isOfferActive } from "@/content/offer";
import { type AppEnv, getEnvAsync, siteUrl } from "@/lib/env";
import { downloadLinks, imagesLink, orderReference } from "@/lib/orders";
import { isAllowedOrigin } from "@/lib/origin";
import { stripeClient } from "@/lib/stripe";
import { type AdminOrder, SHIPPED_AT, TRACKING, listOrders, listOrdersBetween, listPackBuyers, matches, statusOf } from "./data";
import { buildDashboard } from "./dashboard";
import { labelsPage } from "./labels";
import { lastMonths, monthBounds, ordersCsv } from "./export";
import { BIO_ITEMS, type BioKey, MAX_LINKS, type Settings, applySettings, cleanLinkUrl, getSettings, saveSettings } from "@/lib/settings";
import { cancelEmails, listEmails } from "./emails";
import { PREVIEW_COUNT, sendAllPreviews } from "./preview-emails";
import { QUIZ_PERIODS, type QuizPeriod, type QuizStatsView, buildQuizStats } from "./quizstats";
import { listQuizEvents } from "@/lib/quiz-stats";
import { type AdminEmail } from "./emails";
import { type EmailsView, ORDER_TABS, type OrderTab, type SiteInfo, TABS, type Tab, adminPage } from "./view";

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

  const settings = await getSettings(env);
  let all: AdminOrder[] = [];
  let loadError: string | null = null;
  try {
    all = await listOrders(stripeClient(env));
  } catch (err) {
    console.error("admin:", err instanceof Error ? err.message : err);
    loadError = "Impossible de charger les commandes depuis Stripe. Réessaie dans un instant.";
  }

  if (labelIds !== null) {
    const ids = new Set(labelIds.split(","));
    return html(labelsPage(all.filter((o) => ids.has(o.id) && o.format === "papier")));
  }

  // Commandes supprimées de l'admin (tests) : hors listes et statistiques, visibles dans la corbeille.
  const trashed = (o: AdminOrder) => settings.hidden.orders.includes(o.id) || (settings.resetAt !== null && o.createdAt <= settings.resetAt);
  const orders = all.filter((o) => !trashed(o));
  const inTab: Record<OrderTab, (o: AdminOrder) => boolean> = {
    "a-expedier": (o) => ["todo", "late"].includes(statusOf(o)),
    expediees: (o) => o.format === "papier" && Boolean(o.shippedAt),
    ventes: () => true,
    corbeille: () => true,
  };
  const pool = (t: OrderTab) => (t === "corbeille" ? all.filter(trashed) : orders);
  const counts = Object.fromEntries(ORDER_TABS.map((t) => [t.id, pool(t.id).filter((o) => matches(o, q)).filter(inTab[t.id]).length])) as Record<OrderTab, number>;

  let list: AdminOrder[] = [];
  if (ORDER_TABS.some((t) => t.id === tab)) {
    const t = tab as OrderTab;
    list = pool(t).filter((o) => matches(o, q)).filter(inTab[t]);
    // À expédier : les plus anciennes d'abord (premières arrivées, premières servies).
    if (t === "a-expedier") list.sort((a, b) => a.createdAt - b.createdAt);
    if (t === "expediees") list.sort((a, b) => Date.parse(b.shippedAt!) - Date.parse(a.shippedAt!));
  }

  // Emails : l'onglet Emails lit tout l'historique ; l'accueil, une seule page (compteur des envois programmés).
  let emails: EmailsView | undefined;
  let scheduled: number | null = null;
  if (tab === "emails" || tab === "accueil") {
    const res = await listEmails(env, tab === "emails" ? 5 : 1);
    const visible = res.emails.filter((e) => !hiddenEmail(e, settings));
    scheduled = res.error ? null : visible.filter((e) => e.last_event === "scheduled").length;
    if (tab === "emails") {
      emails = {
        emails: visible,
        error: res.error,
        filter: (["en-cours", "tous", "arretes"] as const).find((f) => f === url.searchParams.get("f")) ?? "en-cours",
        q,
      };
    }
  }

  // Quiz : événements anonymes (hors période « Repartir de zéro »).
  let quiz: QuizStatsView | undefined;
  if (tab === "quiz") {
    const period: QuizPeriod = QUIZ_PERIODS.find((p) => String(p) === url.searchParams.get("p")) ?? 30;
    try {
      const hits = await listQuizEvents(env, period);
      quiz = buildQuizStats(settings.resetAt === null ? hits : hits.filter((h) => h.ts / 1000 > settings.resetAt!), period);
    } catch (err) {
      console.error("admin: stats quiz", err instanceof Error ? err.message : err);
      quiz = buildQuizStats([], period, "Les statistiques des quiz n'ont pas pu être lues. Réessaie dans un instant.");
    }
  }

  const ok = url.searchParams.get("ok");
  const error = url.searchParams.get("erreur");
  return html(
    adminPage({
      tab,
      q,
      counts,
      orders: list,
      dashboard: loadError ? null : buildDashboard(orders),
      scheduled,
      notice: noticeFor(ok, url.searchParams.get("n")),
      error: loadError ?? (error ? errorMessage(error) : null),
      tools: { packs: publishedPacks().map((p) => ({ slug: p.slug, name: p.name })), months: lastMonths(), testTo: notifyTo(env), previewCount: PREVIEW_COUNT },
      emails,
      quiz,
      settings:
        tab === "reglages"
          ? {
              print: publishedPacks()
                .filter((p) => p.print)
                .map((p) => ({ slug: p.slug, name: p.name, on: Boolean(applySettings(p, settings).print) })),
              unit: publishedPacks()
                .filter((p) => p.unit && TEST_FEATURES)
                .map((p) => ({ slug: p.slug, name: p.name, on: Boolean(applySettings(p, settings).unit) })),
              quizEmails: settings.quizEmails,
              hiddenOrders: all.filter(trashed).length,
              hiddenEmails: settings.hidden.emails.length,
              resetAt: settings.resetAt,
              bio: BIO_ITEMS.map((i) => ({ ...i, on: settings.bio[i.key] })),
              links: settings.links,
            }
          : undefined,
      site: siteInfo(env),
    }),
  );
}

const hiddenEmail = (e: AdminEmail, s: Settings) =>
  s.hidden.emails.includes(e.id) || (s.resetAt !== null && Date.parse(e.created_at) / 1000 <= s.resetAt);

function siteInfo(env: AppEnv): SiteInfo {
  const key = env.STRIPE_SECRET_KEY ?? "";
  return {
    url: siteUrl(env),
    indexed: IS_LIVE,
    preprod: IS_PREPROD,
    offer: isOfferActive() ? `${OFFER.code} (${OFFER.label}) jusqu'au ${OFFER.endsLabel}` : null,
    stripeMode: /^(sk|rk)_live_/.test(key) ? "live" : /^(sk|rk)_test_/.test(key) ? "test" : "?",
  };
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
  if (action === "lien") return linkAction(env, form, back);
  if (action === "apercu-emails") {
    const to = String(form?.get("to") ?? "").trim().toLowerCase();
    if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(to)) return back("erreur=adresse");
    try {
      const n = await sendAllPreviews(env, to);
      console.log("admin: aperçu des emails envoyé", n);
      return back(`ok=apercu&n=${n}`);
    } catch (err) {
      console.error("admin: aperçu des emails", err instanceof Error ? err.message : err);
      return back("erreur=apercu");
    }
  }
  if (["masquer", "restaurer", "reset", "restaurer-tout"].includes(action)) return trashAction(env, action, form, back);
  if (action === "annuler-email" || action === "annuler-contact") {
    const f = String(form?.get("f") ?? "en-cours");
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
  if (ok === "apercu") return `${Number(n) || 0} emails d'exemple envoyés ✅ Regarde ta boîte (et les spams).`;
  if (ok === "lien-ajoute") return "Bouton ajouté à la page de liens ✅";
  if (ok === "lien-supprime") return "Bouton supprimé.";
  if (ok === "masque") return "Supprimé de l'admin ✅ (restaurable)";
  if (ok === "restaure") return "Restauré ✅";
  if (ok === "reset") return "Compteurs remis à zéro ✅";
  if (ok === "reset-annule") return "Remise à zéro annulée : tout est de retour.";
  if (ok === "tout-restaure") return "Tous les éléments supprimés sont restaurés ✅";
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
    const next = { ...current, print: { ...current.print }, unit: { ...current.unit } };
    if (key === "papier") {
      const slug = String(form?.get("pack") ?? "");
      if (!publishedPacks().some((p) => p.slug === slug && p.print)) return back("erreur=pack");
      next.print[slug] = on;
    } else if (key === "unite") {
      const slug = String(form?.get("pack") ?? "");
      if (!publishedPacks().some((p) => p.slug === slug && p.unit)) return back("erreur=pack");
      next.unit[slug] = on;
    } else if (key === "quiz-emails") {
      next.quizEmails = on;
    } else if (key.startsWith("bio:") && BIO_ITEMS.some((i) => `bio:${i.key}` === key)) {
      next.bio = { ...current.bio, [key.slice(4) as BioKey]: on };
    } else if (key.startsWith("lien:") && current.links.some((l) => `lien:${l.id}` === key)) {
      next.links = current.links.map((l) => (`lien:${l.id}` === key ? { ...l, on } : l));
    } else return back("erreur=reglage");
    await saveSettings(env, next);
    console.log("admin: réglage", key, form?.get("pack") ?? "", on ? "activé" : "désactivé");
    return back("ok=reglage");
  } catch (err) {
    console.error("admin: réglage", err instanceof Error ? err.message : err);
    return back("erreur=reglage");
  }
}

/** Boutons personnalisés de la page de liens : ajout, suppression, ordre. */
async function linkAction(env: AppEnv, form: FormData | null, back: (params: string) => Response): Promise<Response> {
  const op = String(form?.get("op") ?? "");
  const id = String(form?.get("id") ?? "");
  try {
    const s = await getSettings(env);
    let links = [...s.links];
    if (op === "ajout") {
      const label = String(form?.get("label") ?? "").trim().slice(0, 60);
      const emoji = String(form?.get("emoji") ?? "").trim().slice(0, 8);
      const url = cleanLinkUrl(String(form?.get("url") ?? ""));
      if (!label || !url) return back("erreur=lien");
      if (links.length >= MAX_LINKS) return back("erreur=liens-max");
      links.push({ id: crypto.randomUUID().slice(0, 8), label, url, emoji, on: true });
    } else {
      const i = links.findIndex((l) => l.id === id);
      if (i < 0) return back("erreur=reglage");
      if (op === "suppr") links.splice(i, 1);
      else if (op === "monter" && i > 0) [links[i - 1], links[i]] = [links[i], links[i - 1]];
      else if (op === "descendre" && i < links.length - 1) [links[i + 1], links[i]] = [links[i], links[i + 1]];
    }
    await saveSettings(env, { ...s, links });
    console.log("admin: lien", op, id);
    return back(op === "ajout" ? "ok=lien-ajoute" : op === "suppr" ? "ok=lien-supprime" : "ok=reglage");
  } catch (err) {
    console.error("admin: lien", err instanceof Error ? err.message : err);
    return back("erreur=reglage");
  }
}

/** Suppression (masquage) de commandes et d'emails de test, remise à zéro et restauration. */
async function trashAction(env: AppEnv, action: string, form: FormData | null, back: (params: string) => Response): Promise<Response> {
  const type = String(form?.get("type") ?? "");
  const id = String(form?.get("id") ?? "");
  try {
    const s = await getSettings(env);
    const next: Settings = { ...s, hidden: { orders: [...s.hidden.orders], emails: [...s.hidden.emails] } };
    let ok = "masque";

    if (action === "reset") {
      next.resetAt = form?.get("mode") === "annuler" ? null : Math.floor(Date.now() / 1000);
      ok = next.resetAt ? "reset" : "reset-annule";
    } else if (action === "restaurer-tout") {
      next.hidden = { orders: [], emails: [] };
      next.resetAt = null;
      ok = "tout-restaure";
    } else if (type === "commande") {
      if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(id)) return back("erreur=session");
      if (action === "masquer") next.hidden.orders = [...new Set([...next.hidden.orders, id])];
      else {
        next.hidden.orders = next.hidden.orders.filter((x) => x !== id);
        ok = "restaure";
        // Commande antérieure à la remise à zéro : on ne peut pas la restaurer seule.
        if (s.resetAt !== null) return back("erreur=reset");
      }
    } else if (type === "contact" && action === "masquer") {
      const to = String(form?.get("to") ?? "").toLowerCase();
      const { emails } = await listEmails(env);
      const mine = emails.filter((e) => e.to.some((t) => t.toLowerCase() === to));
      if (!mine.length) return back("erreur=email");
      const pending = mine.filter((e) => e.last_event === "scheduled").map((e) => e.id);
      if (pending.length) await cancelEmails(env, pending);
      next.hidden.emails = [...new Set([...next.hidden.emails, ...mine.map((e) => e.id)])];
    } else return back("erreur=reglage");

    await saveSettings(env, next);
    console.log("admin:", action, type, id || "");
    return back(`ok=${ok}`);
  } catch (err) {
    console.error("admin:", action, err instanceof Error ? err.message : err);
    return back("erreur=reglage");
  }
}

const parseTab = (v: string | null): Tab => (TABS.includes(v as Tab) ? (v as Tab) : "accueil");

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
    adresse: "Adresse email invalide.",
    apercu: "L'envoi des exemples s'est arrêté (Resend). Les premiers sont peut-être partis : réessaie dans une minute.",
    lien: "Bouton invalide : un texte et une adresse en https://, mailto: ou /page du site.",
    "liens-max": `Maximum ${MAX_LINKS} boutons : supprimes-en un d'abord.`,
    reset: "Cette commande date d'avant la remise à zéro : annule la remise à zéro (Réglages) pour la retrouver.",
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

import { SHIPPING } from "@/content/shipping";
import { LEGAL, formatPrice } from "@/lib/format";
import { type AdminOrder, type Stats, statusOf } from "./data";
import type { AdminEmail } from "./emails";

// Rendu HTML de la page /admin (pas de React : une page légère, rendue côté serveur).

export type Tab = "a-expedier" | "expediees" | "ventes" | "emails" | "reglages" | "outils";

/** Onglets sans liste de commandes (pas de compteur ni de recherche). */
export const PANEL_TABS: Tab[] = ["emails", "reglages", "outils"];

export const TABS: { id: Tab; label: string }[] = [
  { id: "a-expedier", label: "À expédier" },
  { id: "expediees", label: "Expédiées" },
  { id: "ventes", label: "Ventes" },
  { id: "emails", label: "Emails" },
  { id: "reglages", label: "Réglages" },
  { id: "outils", label: "Outils" },
];

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const dateTime = (ms: number) =>
  new Date(ms).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

const day = (ms: number) => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

function ago(ms: number): string {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 60) return `il y a ${Math.max(min, 1)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return `il y a ${d} jour${d > 1 ? "s" : ""}`;
}

const STATUS_BADGE: Record<ReturnType<typeof statusOf>, string> = {
  todo: `<span class="badge badge--todo">À expédier</span>`,
  late: `<span class="badge badge--late">En retard</span>`,
  shipped: `<span class="badge badge--ok">Expédiée</span>`,
  refunded: `<span class="badge badge--muted">Remboursée</span>`,
  pdf: `<span class="badge badge--pdf">Numérique</span>`,
};

function hiddenFields(o: AdminOrder, tab: Tab, q: string) {
  return `<input type="hidden" name="session_id" value="${esc(o.id)}"><input type="hidden" name="vue" value="${tab}"><input type="hidden" name="q" value="${esc(q)}">`;
}

function orderCard(o: AdminOrder, tab: Tab, q: string): string {
  const status = statusOf(o);
  const meta = [
    `${esc(formatPrice(o.amountCents))}`,
    o.shippingCents ? `dont ${esc(formatPrice(o.shippingCents))} de port` : "",
    o.discountCents ? `réduction −${esc(formatPrice(o.discountCents))}` : "",
    o.provenance !== "direct" ? `via ${esc(o.provenance)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const isPrint = o.format === "papier";
  const address = isPrint
    ? `<div class="addr">${o.lines.map(esc).join("<br>")}</div>
       ${o.deliverable ? "" : `<p class="warn">⚠️ Adresse hors France métropolitaine : à vérifier, rembourser si besoin.</p>`}`
    : "";

  let action = "";
  if (isPrint && !o.refunded) {
    if (o.shippedAt) {
      action = `<div class="shipped">
          <p>📦 Expédiée le ${esc(day(Date.parse(o.shippedAt)))} · suivi
            <a href="https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(o.tracking ?? "")}" target="_blank" rel="noreferrer"><strong>${esc(o.tracking ?? "")}</strong></a></p>
          <details class="fix"><summary>Corriger</summary>
            <form method="post" class="ship">
              ${hiddenFields(o, tab, q)}<input type="hidden" name="action" value="expedier">
              <input name="tracking" required minlength="8" maxlength="40" placeholder="Nouveau n° de suivi" autocomplete="off" aria-label="Nouveau numéro de suivi">
              <button type="submit">Renvoyer</button>
            </form>
            <form method="post" onsubmit="return confirm('Remettre cette commande dans « À expédier » ? (aucun email envoyé)')">
              ${hiddenFields(o, tab, q)}<input type="hidden" name="action" value="annuler">
              <button type="submit" class="link link--danger">Annuler l'expédition</button>
            </form>
          </details>
        </div>`;
    } else {
      action = `<form method="post" class="ship">
          ${hiddenFields(o, tab, q)}<input type="hidden" name="action" value="expedier">
          <input name="tracking" required minlength="8" maxlength="40" placeholder="N° de suivi La Poste" autocomplete="off" autocapitalize="characters" aria-label="Numéro de suivi">
          <button type="submit">Marquer expédiée</button>
        </form>`;
    }
  }

  const tools = [
    isPrint ? `<button type="button" class="link" data-copy="${esc(o.lines.join("\n"))}">Copier l'adresse</button>` : "",
    isPrint && !o.refunded ? `<a href="/admin?etiquettes=${encodeURIComponent(o.id)}" target="_blank">Étiquette</a>` : "",
    o.email ? `<a href="mailto:${esc(o.email)}?subject=${encodeURIComponent(`Ta commande ${o.reference}`)}">Écrire</a>` : "",
    o.stripeUrl ? `<a href="${esc(o.stripeUrl)}" target="_blank" rel="noreferrer">Stripe ↗</a>` : "",
  ]
    .filter(Boolean)
    .join("");

  return `<article class="order order--${status}">
    <header>
      <div><strong>${esc(o.reference)}</strong> ${STATUS_BADGE[status]}</div>
      <time title="${esc(dateTime(o.createdAt * 1000))}">${esc(ago(o.createdAt * 1000))}</time>
    </header>
    <p class="pack">${esc(o.packName)}${isPrint ? " · <em>papier</em>" : ""}</p>
    <p class="muted">${meta}</p>
    ${address}
    <p class="muted">${esc(o.email)}</p>
    ${action}
    <nav class="tools">${tools}</nav>
  </article>`;
}

export interface Tools {
  packs: { slug: string; name: string }[];
  months: { value: string; label: string }[];
  /** Adresse qui reçoit l'email de test. */
  testTo: string;
}

function toolsSection(t: Tools): string {
  return `<section class="tool">
    <h2>📊 Export comptable</h2>
    <p class="muted">Toutes les ventes du mois (numérique et papier), avec remboursements et totaux, pour le livre des recettes.
      Fichier CSV à ouvrir avec Excel, Numbers ou Google Sheets.</p>
    <form method="get" class="row">
      <select name="export" aria-label="Mois">${t.months.map((m) => `<option value="${esc(m.value)}">${esc(m.label)}</option>`).join("")}</select>
      <button type="submit">Télécharger</button>
    </form>
  </section>

  <section class="tool">
    <h2>✨ Envoyer une mise à jour</h2>
    <p class="muted">Après avoir remplacé le PDF (et les images) dans Cloudflare R2 : chaque acheteur du pack reçoit un email avec
      ses nouveaux liens (valables 30 jours). Commence par un test.</p>
    <form method="post" class="stack" onsubmit="return this.test.checked || confirm('Envoyer la mise à jour à TOUS les acheteurs de ce pack ?')">
      <input type="hidden" name="action" value="maj"><input type="hidden" name="vue" value="outils">
      <label>Pack
        <select name="pack">${t.packs.map((p) => `<option value="${esc(p.slug)}">${esc(p.name)}</option>`).join("")}</select>
      </label>
      <label>Ce qui a changé <span class="muted">(facultatif, affiché dans l'email)</span>
        <textarea name="message" rows="3" maxlength="1000" placeholder="Ex. : nouvelle fiche sur la douleur, valeurs de la glycémie précisées…"></textarea>
      </label>
      <label class="check"><input type="checkbox" name="test" checked> M'envoyer seulement un test (à ${esc(t.testTo)})</label>
      <button type="submit">Envoyer</button>
    </form>
  </section>`;
}

/* ---------- Réglages : interrupteurs I/O ---------- */

export interface SettingsView {
  /** Packs qui ont une version papier, avec leur état. */
  print: { slug: string; name: string; on: boolean }[];
  quizEmails: boolean;
}

function toggle(name: string, value: string, on: boolean, title: string, help: string): string {
  return `<form method="post" class="switch-row">
      <input type="hidden" name="action" value="reglage"><input type="hidden" name="vue" value="reglages">
      <input type="hidden" name="cle" value="${esc(name)}"><input type="hidden" name="valeur" value="${on ? "0" : "1"}">
      <span class="switch-row__text"><strong>${esc(title)}</strong><span class="muted">${esc(help)}</span></span>
      <button type="submit" class="switch ${on ? "switch--on" : ""}" role="switch" aria-checked="${on}" aria-label="${esc(title)}">
        <span class="switch__knob">${on ? "I" : "O"}</span>
      </button>
      <input type="hidden" name="pack" value="${esc(value)}">
    </form>`;
}

function settingsSection(s: SettingsView): string {
  return `<section class="tool">
    <h2>📦 Version papier</h2>
    <p class="muted">Désactivée : le choix « Papier » disparaît de la page du pack et de la FAQ, et le paiement papier est refusé. Effet en moins d'une minute.</p>
    ${s.print.length ? s.print.map((p) => toggle("papier", p.slug, p.on, p.name, p.on ? "En vente en papier" : "Numérique uniquement")).join("") : `<p class="muted">Aucun pack n'a de version papier.</p>`}
  </section>
  <section class="tool">
    <h2>📩 Emails du quiz</h2>
    <p class="muted">Formulaire « correction + fiche gratuite » en fin de quiz, puis les 2 emails espacés (conseils, offre). Les envois déjà programmés restent visibles dans l'onglet Emails.</p>
    ${toggle("quiz-emails", "", s.quizEmails, "Formulaire en fin de quiz", s.quizEmails ? "Affiché" : "Masqué")}
  </section>`;
}

/* ---------- Emails (Resend) ---------- */

export interface EmailsView {
  emails: AdminEmail[];
  error: string | null;
  filter: "programmes" | "tous" | "annules";
  q: string;
}

const EMAIL_STATUS: Record<string, [string, string]> = {
  scheduled: ["Programmé", "badge--todo"],
  queued: ["En file", "badge--todo"],
  sent: ["Envoyé", "badge--pdf"],
  delivered: ["Délivré", "badge--ok"],
  opened: ["Ouvert", "badge--ok"],
  clicked: ["Cliqué", "badge--ok"],
  canceled: ["Annulé", "badge--muted"],
  bounced: ["Rejeté", "badge--late"],
  complained: ["Signalé spam", "badge--late"],
  delivery_delayed: ["Retardé", "badge--todo"],
  failed: ["Échec", "badge--late"],
};

function emailsSection(v: EmailsView): string {
  const needle = v.q.trim().toLowerCase();
  const scheduled = v.emails.filter((e) => e.last_event === "scheduled");
  const shown = v.emails
    .filter((e) => (v.filter === "programmes" ? e.last_event === "scheduled" : v.filter === "annules" ? e.last_event === "canceled" : true))
    .filter((e) => !needle || `${e.to.join(" ")} ${e.subject}`.toLowerCase().includes(needle))
    .sort((a, b) =>
      v.filter === "programmes" ? (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? "") : b.created_at.localeCompare(a.created_at),
    );
  const pendingFor = (to: string) => scheduled.filter((e) => e.to.includes(to)).length;
  const qs = (f: string) => `/admin?vue=emails&f=${f}${v.q ? `&q=${encodeURIComponent(v.q)}` : ""}`;
  const pill = (f: EmailsView["filter"], label: string) => `<a href="${esc(qs(f))}" class="${v.filter === f ? "on" : ""}">${esc(label)}</a>`;
  const hidden = `<input type="hidden" name="vue" value="emails"><input type="hidden" name="f" value="${v.filter}"><input type="hidden" name="q" value="${esc(v.q)}">`;

  const cards = shown
    .map((e) => {
      const [label, cls] = EMAIL_STATUS[e.last_event] ?? [e.last_event, "badge--muted"];
      const isSched = e.last_event === "scheduled";
      const when = isSched && e.scheduled_at
        ? `Envoi prévu le <strong>${esc(dateTime(Date.parse(e.scheduled_at)))}</strong>`
        : `Créé ${esc(ago(Date.parse(e.created_at)))} · ${esc(dateTime(Date.parse(e.created_at)))}`;
      const n = isSched ? pendingFor(e.to[0]) : 0;
      const actions = isSched
        ? `<nav class="tools">
            <form method="post" onsubmit="return confirm('Annuler cet envoi ?')">${hidden}<input type="hidden" name="action" value="annuler-email"><input type="hidden" name="email_id" value="${esc(e.id)}"><button type="submit" class="link link--danger">Annuler l'envoi</button></form>
            ${n > 1 ? `<form method="post" onsubmit="return confirm('Annuler les ${n} envois programmés pour ce contact ?')">${hidden}<input type="hidden" name="action" value="annuler-contact"><input type="hidden" name="to" value="${esc(e.to[0])}"><button type="submit" class="link link--danger">Annuler ses ${n} envois</button></form>` : ""}
          </nav>`
        : "";
      return `<article class="order ${isSched ? "order--todo" : e.last_event === "canceled" ? "order--refunded" : "order--pdf"}">
        <header><div><strong>${esc(e.to.join(", "))}</strong> <span class="badge ${cls}">${esc(label)}</span></div></header>
        <p class="pack">${esc(e.subject)}</p>
        <p class="muted">${when}</p>
        ${actions}
      </article>`;
    })
    .join("");

  return `${v.error ? `<p class="msg msg--err" role="alert">${esc(v.error)}</p>` : ""}
  <section class="stats" aria-label="Emails">
    ${statTile(String(scheduled.length), "programmés", scheduled.length ? "stat--todo" : "")}
    ${statTile(String(v.emails.filter((e) => ["delivered", "opened", "clicked", "sent"].includes(e.last_event)).length), "envoyés")}
    ${statTile(String(v.emails.filter((e) => ["opened", "clicked"].includes(e.last_event)).length), "ouverts")}
    ${statTile(String(v.emails.filter((e) => e.last_event === "canceled").length), "annulés")}
  </section>
  <nav class="tabs tabs--sub">${pill("programmes", `Programmés (${scheduled.length})`)}${pill("tous", "Tous")}${pill("annules", "Annulés")}</nav>
  <form class="search" method="get" role="search">
    <input type="hidden" name="vue" value="emails"><input type="hidden" name="f" value="${v.filter}">
    <input type="search" name="q" value="${esc(v.q)}" placeholder="Rechercher : email, sujet…" aria-label="Rechercher">
  </form>
  <section class="list">${cards || `<p class="empty">${v.filter === "programmes" ? "Aucun envoi programmé." : "Aucun email."}</p>`}</section>
  <p class="foot">500 derniers emails Resend · heures de Paris</p>`;
}

function statTile(value: string, label: string, tone = "") {
  return `<div class="stat ${tone}"><span class="stat__value">${value}</span><span class="stat__label">${esc(label)}</span></div>`;
}

export function adminPage(opts: {
  orders: AdminOrder[];
  stats: Stats | null;
  tab: Tab;
  q: string;
  notice: string | null;
  error: string | null;
  counts: Record<Tab, number>;
  tools: Tools;
  settings?: SettingsView;
  emails?: EmailsView;
}): string {
  const { orders, stats, tab, q } = opts;
  const qs = (t: Tab) => `/admin?vue=${t}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const empty =
    tab === "a-expedier"
      ? "Rien à expédier pour le moment 🎉"
      : q
        ? "Aucune commande ne correspond à la recherche."
        : "Aucune commande pour le moment.";
  const toShipIds = tab === "a-expedier" ? orders.map((o) => o.id) : [];

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="color-scheme" content="light">
<title>${stats?.toShip ? `(${stats.toShip}) ` : ""}Commandes · La Petite IDE</title>
<style>${CSS}</style></head>
<body><main>
  <header class="top">
    <div>
      <p class="brand">La Petite IDE · admin</p>
      <h1>Commandes</h1>
    </div>
    <a class="refresh" href="${esc(qs(tab))}" aria-label="Actualiser">↻</a>
  </header>

  ${opts.notice ? `<p class="msg msg--ok" role="status">${esc(opts.notice)}</p>` : ""}
  ${opts.error ? `<p class="msg msg--err" role="alert">${esc(opts.error)}</p>` : ""}

  ${
    stats
      ? `<section class="stats" aria-label="Résumé">
      ${statTile(String(stats.toShip), "à expédier", stats.toShip ? "stat--todo" : "")}
      ${statTile(String(stats.late), "en retard", stats.late ? "stat--late" : "")}
      ${statTile(esc(formatPrice(stats.monthRevenueCents)), `ventes de ${stats.monthLabel}`)}
      ${statTile(`${stats.monthOrders}`, `commandes · ${stats.monthPrint} papier`)}
    </section>`
      : ""
  }

  <nav class="tabs" aria-label="Vues">
    ${TABS.map((t) => `<a href="${esc(qs(t.id))}" class="${t.id === tab ? "on" : ""}"${t.id === tab ? ' aria-current="page"' : ""}>${esc(t.label)} ${PANEL_TABS.includes(t.id) ? "" : `<span>${opts.counts[t.id]}</span>`}</a>`).join("")}
  </nav>

  ${tab === "outils" ? toolsSection(opts.tools) : tab === "reglages" && opts.settings ? settingsSection(opts.settings) : tab === "emails" && opts.emails ? emailsSection(opts.emails) : `  <form class="search" method="get" role="search">
    <input type="hidden" name="vue" value="${tab}">
    <input type="search" name="q" value="${esc(q)}" placeholder="Rechercher : nom, email, référence, ville…" aria-label="Rechercher">
    ${q ? `<a href="/admin?vue=${tab}" class="link">Effacer</a>` : ""}
  </form>

  ${
    toShipIds.length > 1
      ? `<a class="bulk" href="/admin?etiquettes=${encodeURIComponent(toShipIds.join(","))}" target="_blank">🖨️ Imprimer les ${toShipIds.length} étiquettes</a>`
      : ""
  }

  <section class="list">
    ${orders.length ? orders.map((o) => orderCard(o, tab, q)).join("") : `<p class="empty">${esc(empty)}</p>`}
  </section>

`}
  <p class="foot">${esc(SHIPPING.dispatch)} · « En retard » après 2 jours ouvrés · 300 dernières commandes</p>
</main>
<script>
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy]"); if (!b) return;
    navigator.clipboard.writeText(b.getAttribute("data-copy")).then(function () {
      var t = b.textContent; b.textContent = "Copiée ✓"; setTimeout(function () { b.textContent = t; }, 1500);
    });
  });
  document.addEventListener("submit", function (e) {
    var btn = e.target.querySelector("button[type=submit]");
    if (btn && !e.defaultPrevented) { setTimeout(function () { btn.disabled = true; btn.textContent = "…"; }, 0); }
  });
</script>
</body></html>`;
}

/** Page d'étiquettes à imprimer (destinataire + expéditeur), 2 par ligne sur A4. */
export function labelsPage(orders: AdminOrder[]): string {
  const sender = `${LEGAL.tradeName} — ${LEGAL.address}`;
  const labels = orders
    .map(
      (o) => `<div class="label">
      <p class="label__to">${o.lines.map(esc).join("<br>")}</p>
      <p class="label__from">Exp. : ${esc(sender)}</p>
      <p class="label__ref">${esc(o.reference)}</p>
    </div>`,
    )
    .join("");
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Étiquettes · La Petite IDE</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.4 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #000; background: #fff; }
  .bar { display: flex; gap: 12px; align-items: center; justify-content: space-between; padding: 12px 16px; background: #EEF3FB; }
  .bar button { font: inherit; font-weight: 700; padding: 8px 14px; border: 0; border-radius: 10px; background: #4E7AC7; color: #fff; cursor: pointer; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90mm, 1fr)); gap: 6mm; padding: 16px; }
  .label { border: 1px dashed #999; border-radius: 3mm; padding: 6mm; min-height: 45mm; break-inside: avoid; display: flex; flex-direction: column; }
  .label__to { margin: 0; font-size: 15px; font-weight: 600; line-height: 1.45; flex: 1; }
  .label__from { margin: 4mm 0 0; font-size: 9px; color: #444; }
  .label__ref { margin: 1mm 0 0; font-size: 8px; color: #888; }
  @media print { .bar { display: none; } .grid { padding: 0; grid-template-columns: 1fr 1fr; } }
</style></head>
<body>
  <div class="bar"><span>${orders.length} étiquette${orders.length > 1 ? "s" : ""} · à découper</span><button type="button" onclick="window.print()">Imprimer</button></div>
  <div class="grid">${labels || "<p>Aucune étiquette.</p>"}</div>
</body></html>`;
}

const CSS = `
  :root { --p:#4E7AC7; --p50:#EEF3FB; --ink:#2D3A5A; --soft:#5B6784; --line:#E3E8F2; --bg:#F8F9FC;
    --ok:#2F8F6B; --ok50:#E8F5EF; --late:#C9668F; --late50:#FCF0F5; --todo:#B7791F; --todo50:#FDF5E6; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 Inter,-apple-system,"Segoe UI",Roboto,sans-serif; -webkit-text-size-adjust:100%; }
  main { max-width:720px; margin:0 auto; padding:20px 16px 48px; }
  a { color:var(--p); }
  button { font:inherit; cursor:pointer; }
  .top { display:flex; justify-content:space-between; align-items:flex-end; gap:12px; margin-bottom:16px; }
  .brand { margin:0; font-size:.8rem; font-weight:700; color:var(--p); letter-spacing:.02em; }
  h1 { margin:0; font-size:1.6rem; line-height:1.2; }
  .refresh { display:grid; place-items:center; width:40px; height:40px; border-radius:12px; background:#fff; border:1px solid var(--line); text-decoration:none; font-size:1.2rem; }
  .stats { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin-bottom:16px; }
  @media (min-width:640px) { .stats { grid-template-columns:repeat(4,1fr); } }
  .stat { background:#fff; border:1px solid var(--line); border-radius:16px; padding:12px 14px; display:grid; gap:2px; }
  .stat__value { font-size:1.35rem; font-weight:800; }
  .stat__label { font-size:.78rem; color:var(--soft); line-height:1.3; }
  .stat--todo { background:var(--todo50); border-color:transparent; } .stat--todo .stat__value { color:var(--todo); }
  .stat--late { background:var(--late50); border-color:transparent; } .stat--late .stat__value { color:var(--late); }
  .tabs { display:flex; flex-wrap:wrap; gap:4px; padding:4px; background:#fff; border:1px solid var(--line); border-radius:14px; margin-bottom:10px; overflow-x:auto; }
  .tabs a { flex:1 1 30%; white-space:nowrap; text-align:center; padding:8px 4px; border-radius:10px; text-decoration:none; color:var(--soft); font-weight:600; font-size:.84rem; }
  .tabs a span { display:inline-block; min-width:18px; padding:0 5px; border-radius:99px; background:var(--bg); font-size:.75rem; margin-left:2px; }
  .tabs a.on { background:var(--p); color:#fff; } .tabs a.on span { background:rgb(255 255 255 / 25%); }
  .search { display:flex; gap:10px; align-items:center; margin-bottom:12px; }
  .search input { flex:1; min-width:0; padding:10px 14px; border:1.5px solid var(--line); border-radius:12px; font:inherit; background:#fff; }
  .search input:focus, .ship input:focus { outline:none; border-color:var(--p); box-shadow:0 0 0 3px var(--p50); }
  .bulk { display:block; text-align:center; padding:10px; margin-bottom:12px; border:1.5px dashed var(--p); border-radius:12px; text-decoration:none; font-weight:600; background:var(--p50); }
  .order { background:#fff; border:1px solid var(--line); border-left:4px solid var(--line); border-radius:16px; padding:14px 16px; margin-bottom:10px; }
  .order--todo { border-left-color:var(--todo); } .order--late { border-left-color:var(--late); }
  .order--shipped { border-left-color:var(--ok); } .order--pdf { border-left-color:var(--p); } .order--refunded { opacity:.7; }
  .order header { display:flex; justify-content:space-between; align-items:center; gap:8px; }
  .order time { font-size:.8rem; color:var(--soft); white-space:nowrap; }
  .order p { margin:6px 0 0; }
  .pack { font-weight:600; } .pack em { font-style:normal; color:var(--p); }
  .muted { color:var(--soft); font-size:.86rem; }
  .badge { display:inline-block; font-size:.72rem; font-weight:700; padding:1px 8px; border-radius:99px; margin-left:6px; vertical-align:1px; }
  .badge--todo { background:var(--todo50); color:var(--todo); } .badge--late { background:var(--late50); color:#9B3A63; }
  .badge--ok { background:var(--ok50); color:var(--ok); } .badge--pdf { background:var(--p50); color:var(--p); }
  .badge--muted { background:var(--bg); color:var(--soft); }
  .addr { margin-top:10px; padding:10px 12px; background:var(--bg); border-radius:10px; font-size:.95rem; line-height:1.45; }
  .warn { padding:8px 12px; background:var(--late50); color:#9B3A63; border-radius:10px; font-size:.86rem; }
  .ship { display:flex; gap:8px; margin-top:12px; }
  .ship input { flex:1; min-width:0; padding:10px 12px; border:1.5px solid var(--line); border-radius:12px; font:inherit; text-transform:uppercase; }
  .ship button { padding:10px 14px; border:0; border-radius:12px; background:var(--p); color:#fff; font-weight:700; white-space:nowrap; }
  .ship button:disabled { opacity:.6; }
  .shipped { margin-top:10px; padding:8px 12px; background:var(--ok50); border-radius:10px; font-size:.9rem; }
  .shipped p { margin:0; }
  .fix summary { cursor:pointer; color:var(--soft); font-size:.82rem; margin-top:4px; }
  .fix form { margin-top:8px; }
  .tools { display:flex; flex-wrap:wrap; gap:4px 14px; margin-top:10px; padding-top:10px; border-top:1px solid var(--line); font-size:.85rem; }
  .tools a { text-decoration:none; }
  .link { border:0; background:none; padding:0; color:var(--p); font-size:inherit; }
  .link--danger { color:#9B3A63; }
  .msg { padding:10px 14px; border-radius:12px; margin:0 0 14px; }
  .msg--ok { background:var(--ok50); color:#1F6B4F; } .msg--err { background:var(--late50); color:#9B3A63; }
  .empty { background:#fff; border:1px dashed var(--line); border-radius:16px; padding:24px; text-align:center; color:var(--soft); }
  .tool { background:#fff; border:1px solid var(--line); border-radius:16px; padding:16px; margin-bottom:12px; }
  .tool h2 { margin:0 0 4px; font-size:1.05rem; }
  .tool .muted { margin:0 0 12px; }
  .row { display:flex; gap:8px; }
  .stack { display:grid; gap:12px; }
  .stack label { display:grid; gap:6px; font-weight:600; font-size:.9rem; }
  .stack label .muted { font-weight:400; }
  .stack label.check { display:flex; align-items:center; gap:8px; font-weight:500; }
  .tool select, .tool textarea { flex:1; min-width:0; padding:10px 12px; border:1.5px solid var(--line); border-radius:12px; font:inherit; background:#fff; color:inherit; }
  .tool textarea { resize:vertical; }
  .tool select:focus, .tool textarea:focus { outline:none; border-color:var(--p); box-shadow:0 0 0 3px var(--p50); }
  .tool button { padding:10px 16px; border:0; border-radius:12px; background:var(--p); color:#fff; font-weight:700; white-space:nowrap; }
  .switch-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-top:1px solid var(--line); }
  .switch-row:first-of-type { border-top:0; }
  .switch-row__text { flex:1; display:grid; gap:2px; }
  .switch-row__text .muted { margin:0; font-size:.82rem; }
  .tool .switch { position:relative; width:64px; height:34px; padding:0; border-radius:99px; background:#D5DCEA; flex:none; transition:background .2s; }
  .tool .switch--on { background:var(--ok); }
  .switch__knob { position:absolute; top:3px; left:3px; width:28px; height:28px; border-radius:50%; background:#fff; color:var(--soft); font-weight:800; font-size:.8rem; display:grid; place-items:center; box-shadow:0 1px 3px rgb(0 0 0 / 20%); transition:left .2s; }
  .switch--on .switch__knob { left:33px; color:var(--ok); }
  .tabs--sub a { font-size:.8rem; }
  .tools form { display:inline; }
  .foot { margin-top:20px; text-align:center; font-size:.78rem; color:var(--soft); }
`;

import { formatPrice } from "@/lib/format";
import type { Dashboard } from "./dashboard";
import { QUIZ_PERIODS, type QuizStatsView } from "./quizstats";
import { type AdminOrder, statusOf } from "./data";
import type { AdminEmail } from "./emails";
import type { BioLink } from "@/lib/settings";

// Rendu HTML de la page /admin (pas de React : une page légère, rendue côté serveur).
// Navigation : barre latérale sur ordinateur, barre d'onglets en bas sur mobile.

export type Tab = "accueil" | "quiz" | "a-expedier" | "expediees" | "ventes" | "corbeille" | "emails" | "reglages" | "outils";
export type OrderTab = "a-expedier" | "expediees" | "ventes" | "corbeille";

export const ORDER_TABS: { id: OrderTab; label: string }[] = [
  { id: "a-expedier", label: "À expédier" },
  { id: "expediees", label: "Expédiées" },
  { id: "ventes", label: "Toutes" },
  { id: "corbeille", label: "Corbeille" },
];
export const TABS: Tab[] = ["accueil", "quiz", ...ORDER_TABS.map((t) => t.id), "emails", "reglages", "outils"];
export const isOrderTab = (t: Tab): t is OrderTab => ORDER_TABS.some((o) => o.id === t);

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const dateTime = (ms: number) =>
  new Date(ms).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const day = (ms: number) => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

function ago(ms: number): string {
  const diff = Date.now() - ms;
  const future = diff < 0;
  const min = Math.round(Math.abs(diff) / 60000);
  const say = (v: string) => (future ? `dans ${v}` : `il y a ${v}`);
  if (min < 60) return say(`${Math.max(min, 1)} min`);
  const h = Math.round(min / 60);
  if (h < 24) return say(`${h} h`);
  const d = Math.round(h / 24);
  return say(`${d} jour${d > 1 ? "s" : ""}`);
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

/* ---------- Icônes (traits, 24 px) ---------- */

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  chart: '<path d="M3 21h18"/><rect x="5" y="11" width="3" height="7" rx="1"/><rect x="10.5" y="6" width="3" height="12" rx="1"/><rect x="16" y="13" width="3" height="5" rx="1"/>',
} as const;
type IconName = keyof typeof ICONS;
const icon = (name: IconName, cls = "ico") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

/* ---------- Données passées à la page ---------- */

export interface Tools {
  packs: { slug: string; name: string }[];
  months: { value: string; label: string }[];
  /** Adresse qui reçoit l'email de test. */
  testTo: string;
  /** Nombre d'emails envoyés par « Aperçu des emails ». */
  previewCount: number;
}

export interface SettingsView {
  /** Packs qui ont une version papier, avec leur état. */
  print: { slug: string; name: string; on: boolean }[];
  quizEmails: boolean;
  hiddenOrders: number;
  hiddenEmails: number;
  resetAt: number | null;
  bio: { key: string; label: string; help: string; on: boolean }[];
  links: BioLink[];
}

export interface SiteInfo {
  url: string;
  indexed: boolean;
  preprod: boolean;
  offer: string | null;
  stripeMode: "test" | "live" | "?";
}

export interface EmailsView {
  emails: AdminEmail[];
  error: string | null;
  filter: "en-cours" | "tous" | "arretes";
  q: string;
}

export interface PageData {
  tab: Tab;
  q: string;
  notice: string | null;
  error: string | null;
  /** Compteurs des vues de commandes (après recherche). */
  counts: Record<OrderTab, number>;
  orders: AdminOrder[];
  dashboard: Dashboard | null;
  /** Emails programmés (null si inconnu). */
  scheduled: number | null;
  emails?: EmailsView;
  settings?: SettingsView;
  quiz?: QuizStatsView;
  tools: Tools;
  site: SiteInfo;
}

/* ---------- Commandes ---------- */

const STATUS_BADGE: Record<ReturnType<typeof statusOf>, string> = {
  todo: `<span class="badge badge--todo">À expédier</span>`,
  late: `<span class="badge badge--late">En retard</span>`,
  shipped: `<span class="badge badge--ok">Expédiée</span>`,
  refunded: `<span class="badge badge--muted">Remboursée</span>`,
  pdf: `<span class="badge badge--pdf">Numérique</span>`,
};

function hiddenFields(tab: Tab, q: string, extra: Record<string, string> = {}) {
  return [
    `<input type="hidden" name="vue" value="${tab}">`,
    `<input type="hidden" name="q" value="${esc(q)}">`,
    ...Object.entries(extra).map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`),
  ].join("");
}

function orderCard(o: AdminOrder, tab: Tab, q: string, trashed = false): string {
  const status = statusOf(o);
  const meta = [
    `<strong>${esc(formatPrice(o.amountCents))}</strong>`,
    o.shippingCents ? `dont ${esc(formatPrice(o.shippingCents))} de port` : "",
    o.discountCents ? `réduction −${esc(formatPrice(o.discountCents))}` : "",
    o.provenance !== "direct" ? `via <span class="chip">${esc(o.provenance)}</span>` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const isPrint = o.format === "papier";
  const sid = { session_id: o.id };
  const address = isPrint
    ? `<div class="addr">${o.lines.map(esc).join("<br>")}</div>
       ${o.deliverable ? "" : `<p class="warn">⚠️ Adresse hors France métropolitaine : à vérifier, rembourser si besoin.</p>`}`
    : "";

  let action = "";
  if (isPrint && !o.refunded && !trashed) {
    if (o.shippedAt) {
      action = `<div class="shipped">
          <p>📦 Expédiée le ${esc(day(Date.parse(o.shippedAt)))} · suivi
            <a href="https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(o.tracking ?? "")}" target="_blank" rel="noreferrer"><strong>${esc(o.tracking ?? "")}</strong></a></p>
          <details class="fix"><summary>Corriger</summary>
            <form method="post" class="ship">
              ${hiddenFields(tab, q, { ...sid, action: "expedier" })}
              <input name="tracking" required minlength="8" maxlength="40" placeholder="Nouveau n° de suivi" autocomplete="off" aria-label="Nouveau numéro de suivi">
              <button type="submit" class="btn">Renvoyer</button>
            </form>
            <form method="post" data-confirm="Remettre cette commande dans « À expédier » ? (aucun email envoyé)">
              ${hiddenFields(tab, q, { ...sid, action: "annuler" })}
              <button type="submit" class="link link--danger">Annuler l'expédition</button>
            </form>
          </details>
        </div>`;
    } else {
      action = `<form method="post" class="ship">
          ${hiddenFields(tab, q, { ...sid, action: "expedier" })}
          <input name="tracking" required minlength="8" maxlength="40" placeholder="N° de suivi La Poste" autocomplete="off" autocapitalize="characters" aria-label="Numéro de suivi">
          <button type="submit" class="btn">Marquer expédiée</button>
        </form>`;
    }
  }

  const tools = trashed
    ? `<form method="post">${hiddenFields(tab, q, { action: "restaurer", type: "commande", id: o.id })}<button type="submit" class="link">${icon("undo")} Restaurer</button></form>`
    : [
        isPrint ? `<button type="button" class="link" data-copy="${esc(o.lines.join("\n"))}">Copier l'adresse</button>` : "",
        isPrint && !o.refunded ? `<a href="/admin?etiquettes=${encodeURIComponent(o.id)}" target="_blank">Étiquette</a>` : "",
        o.email ? `<a href="mailto:${esc(o.email)}?subject=${encodeURIComponent(`Ta commande ${o.reference}`)}">Écrire</a>` : "",
        o.stripeUrl ? `<a href="${esc(o.stripeUrl)}" target="_blank" rel="noreferrer">Stripe ${icon("external", "ico ico--sm")}</a>` : "",
        `<form method="post" class="push" data-confirm="Supprimer la commande ${esc(o.reference)} de l'admin ? (statistiques comprises ; restaurable depuis la corbeille. Le paiement Stripe n'est pas modifié.)">${hiddenFields(tab, q, { action: "masquer", type: "commande", id: o.id })}<button type="submit" class="link link--danger">${icon("trash")} Supprimer</button></form>`,
      ]
        .filter(Boolean)
        .join("");

  return `<article class="card order order--${status}">
    <header>
      <div><strong class="ref">${esc(o.reference)}</strong> ${STATUS_BADGE[status]}</div>
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

function ordersSection(d: PageData): string {
  const tab = d.tab as OrderTab;
  const qs = (t: Tab) => `/admin?vue=${t}${d.q ? `&q=${encodeURIComponent(d.q)}` : ""}`;
  const empty =
    d.q
      ? "Aucune commande ne correspond à la recherche."
      : { "a-expedier": "Rien à expédier pour le moment 🎉", expediees: "Aucune commande expédiée.", ventes: "Aucune commande pour le moment.", corbeille: "La corbeille est vide." }[tab];
  const toShipIds = tab === "a-expedier" ? d.orders.map((o) => o.id) : [];
  return `
  <nav class="seg" aria-label="Vues">
    ${ORDER_TABS.map((t) => `<a href="${esc(qs(t.id))}" class="${t.id === tab ? "on" : ""}"${t.id === tab ? ' aria-current="page"' : ""}>${esc(t.label)} <span>${d.counts[t.id]}</span></a>`).join("")}
  </nav>
  <form class="search" method="get" role="search">
    ${icon("search")}
    <input type="hidden" name="vue" value="${tab}">
    <input type="search" name="q" value="${esc(d.q)}" placeholder="Nom, email, référence, ville…" aria-label="Rechercher une commande">
    ${d.q ? `<a href="/admin?vue=${tab}" class="link">Effacer</a>` : ""}
  </form>
  ${tab === "corbeille" && d.orders.length ? `<p class="hint">Commandes supprimées de l'admin : elles ne comptent plus dans les statistiques. L'export comptable, lui, garde toutes les transactions réelles.</p>` : ""}
  ${toShipIds.length > 1 ? `<a class="bulk" href="/admin?etiquettes=${encodeURIComponent(toShipIds.join(","))}" target="_blank">🖨️ Imprimer les ${toShipIds.length} étiquettes</a>` : ""}
  <section class="list">
    ${d.orders.length ? d.orders.map((o) => orderCard(o, tab, d.q, tab === "corbeille")).join("") : `<p class="empty">${esc(empty)}</p>`}
  </section>`;
}

/* ---------- Tableau de bord ---------- */

function delta(cur: number, prev: number, label: string): string {
  if (!prev && !cur) return `<span class="delta">— vs ${esc(label)}</span>`;
  if (!prev) return `<span class="delta delta--up">▲ nouveau vs ${esc(label)}</span>`;
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return `<span class="delta">= vs ${esc(label)}</span>`;
  return `<span class="delta ${pct > 0 ? "delta--up" : "delta--down"}">${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)} % vs ${esc(label)}</span>`;
}

function kpi(label: string, value: string, foot = "", tone = ""): string {
  return `<div class="kpi ${tone}"><span class="kpi__label">${esc(label)}</span><span class="kpi__value">${value}</span>${foot ? `<span class="kpi__foot">${foot}</span>` : ""}</div>`;
}

const euroShort = (cents: number) => `${Math.round(cents / 100)} €`;

/** Pas d'axe « rond » : 1, 2, 5 × 10ⁿ euros. */
function niceMax(cents: number): number {
  const euros = Math.max(cents / 100, 5);
  const pow = 10 ** Math.floor(Math.log10(euros));
  const step = [1, 2, 5, 10].find((m) => m * pow >= euros)! * pow;
  return step * 100;
}

function salesChart(days: Dashboard["days"]): string {
  return barChart(
    days.map((d) => ({ label: d.label, value: d.cents, tip: `${d.label} · ${d.count ? `${plural(d.count, "commande")} · ${formatPrice(d.cents)}` : "aucune vente"}` })),
    niceMax(Math.max(...days.map((d) => d.cents))),
    euroShort,
    "Ventes par jour sur 30 jours",
  );
}

/** Maximum d'axe pour un nombre entier, dont la moitié est aussi entière : 4, 10, 20, 40, 100… */
function niceCount(n: number): number {
  const v = Math.max(n, 4);
  const pow = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 4, 10].find((m) => m * pow >= v)! * pow;
}

/** Histogramme à une série (barres arrondies, infobulle au survol). */
function barChart(points: { label: string; value: number; tip: string }[], max: number, axis: (v: number) => string, aria: string): string {
  const days = points;
  const W = 640, H = 220, padL = 58, padT = 12, padB = 34;
  const plotH = H - padT - padB;
  const slot = (W - padL) / days.length;
  const barW = Math.max(slot - 4, 2);
  const y = (c: number) => padT + plotH - (c / max) * plotH;

  const grid = [0, 0.5, 1]
    .map((f) => {
      const yy = y(max * f);
      return `<line x1="${padL}" x2="${W}" y1="${yy}" y2="${yy}" class="grid${f === 0 ? " grid--base" : ""}"/><text x="${padL - 10}" y="${yy + 5}" class="axis" text-anchor="end">${axis(max * f)}</text>`;
    })
    .join("");

  const bars = days
    .map((d, i) => {
      const x = padL + i * slot + (slot - barW) / 2;
      const h = (d.value / max) * plotH;
      const base = padT + plotH;
      const r = Math.min(4, h, barW / 2);
      const bar =
        h > 0
          ? `<path class="bar" d="M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + barW - r} Q${x + barW},${base - h} ${x + barW},${base - h + r} V${base} Z"/>`
          : "";
      const tip = d.tip;
      return `<g class="col" data-tip="${esc(tip)}" tabindex="0"><rect class="hit" x="${padL + i * slot}" y="${padT}" width="${slot}" height="${plotH}"/>${bar}</g>`;
    })
    .join("");

  const labels = days
    .map((d, i) =>
      (days.length > 10 ? i % Math.ceil(days.length / 4.3) === 1 : true) || i === days.length - 1
        ? `<text x="${padL + i * slot + slot / 2}" y="${H - 8}" class="axis" text-anchor="${i === days.length - 1 ? "end" : "middle"}">${i === days.length - 1 ? "auj." : esc(d.label)}</text>`
        : "",
    )
    .join("");

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">${grid}${bars}${labels}</svg>`;
}

function dashboardSection(d: PageData): string {
  const b = d.dashboard;
  if (!b) return `<p class="empty">Les chiffres n'ont pas pu être chargés depuis Stripe.</p>`;
  const total30 = b.days.reduce((t, x) => t + x.cents, 0);
  const count30 = b.days.reduce((t, x) => t + x.count, 0);
  const maxSource = Math.max(...b.sources.map((s) => s.cents), 1);
  const prevLabel = `${b.prevMonthLabel.slice(0, 4)}.`;

  const alert = b.toShip
    ? `<a class="alert ${b.late ? "alert--late" : ""}" href="/admin?vue=a-expedier">
        <span>📦 <strong>${plural(b.toShip, "commande papier")} à expédier</strong>${b.late ? ` · dont ${b.late} en retard` : ""}</span><span aria-hidden="true">→</span>
      </a>`
    : "";

  const sources = b.sources.length
    ? `<ul class="hbars">${b.sources
        .map(
          (s) => `<li><span class="hbars__name">${esc(s.name === "direct" ? "Accès direct" : s.name)}</span>
          <span class="hbars__val">${esc(formatPrice(s.cents))} <span class="muted">· ${plural(s.count, "vente")}</span></span>
          <span class="hbars__track"><span class="hbars__fill" style="width:${Math.max((s.cents / maxSource) * 100, 2).toFixed(1)}%"></span></span></li>`,
        )
        .join("")}</ul>`
    : `<p class="muted">Aucune vente sur 30 jours.</p>`;

  const recent = b.recent.length
    ? `<ul class="rows">${b.recent
        .map(
          (o) => `<li><a href="/admin?vue=ventes&q=${encodeURIComponent(o.reference)}">
          <span class="rows__main"><strong>${esc(o.packName)}</strong>${o.format === "papier" ? " · papier" : ""}<span class="muted">${esc(o.email)} · ${esc(ago(o.createdAt * 1000))}</span></span>
          <span class="rows__side">${esc(formatPrice(o.amountCents))}${STATUS_BADGE[statusOf(o)]}</span></a></li>`,
        )
        .join("")}</ul>`
    : `<p class="empty">Aucune commande pour le moment. Les ventes apparaîtront ici.</p>`;

  return `${alert}
  <section class="kpis" aria-label="Chiffres clés">
    ${kpi(`Ventes de ${b.monthLabel}`, esc(formatPrice(b.revenue)), delta(b.revenue, b.revenuePrev, prevLabel), "kpi--hero")}
    ${kpi("Commandes du mois", String(b.orders), delta(b.orders, b.ordersPrev, prevLabel))}
    ${kpi("Panier moyen", b.orders ? esc(formatPrice(b.avgBasket)) : "—", b.promoOrders ? `${b.promoOrders} avec code promo` : "")}
    ${kpi("Aujourd'hui", String(b.today.orders), b.today.orders ? esc(formatPrice(b.today.cents)) : "pas encore de vente")}
  </section>

  <section class="card">
    <header class="card__head"><h2>Ventes · 30 jours</h2><span class="muted">${esc(formatPrice(total30))} · ${plural(count30, "commande")}</span></header>
    ${salesChart(b.days)}
  </section>

  <div class="cols">
    <section class="card">
      <header class="card__head"><h2>D'où viennent les ventes</h2><span class="muted">30 jours</span></header>
      ${sources}
      <p class="hint">Liens suivis avec <code>?src=</code> (ex. lapetiteide.fr/?src=tiktok).</p>
    </section>
    <section class="card">
      <header class="card__head"><h2>En bref</h2></header>
      <ul class="facts">
        <li><span>Numérique / papier (30 j)</span><strong>${b.formats.pdf} / ${b.formats.papier}</strong></li>
        <li><span>Remboursements du mois</span><strong>${b.refunds}</strong></li>
        <li><span>Emails programmés</span><strong>${d.scheduled === null ? "—" : `<a href="/admin?vue=emails">${d.scheduled}</a>`}</strong></li>
        <li><span>Offre en cours</span><strong>${d.site.offer ? esc(d.site.offer) : "aucune"}</strong></li>
      </ul>
    </section>
  </div>

  <section class="card">
    <header class="card__head"><h2>Dernières commandes</h2><a href="/admin?vue=ventes" class="link">Tout voir →</a></header>
    ${recent}
  </section>`;
}

/* ---------- Quiz : statistiques ---------- */

const pctOf = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)} %` : "—");

function hbars(rows: { name: string; value: number; label: string }[], max = Math.max(...rows.map((r) => r.value), 1)): string {
  return `<ul class="hbars">${rows
    .map(
      (r) => `<li><span class="hbars__name">${esc(r.name)}</span><span class="hbars__val">${r.label}</span>
      <span class="hbars__track"><span class="hbars__fill" style="width:${r.value ? Math.max((r.value / max) * 100, 2).toFixed(1) : 0}%"></span></span></li>`,
    )
    .join("")}</ul>`;
}

function quizSection(v: QuizStatsView): string {
  const t = v.totals;
  const period = `<nav class="seg seg--inline" aria-label="Période">${QUIZ_PERIODS.map((p) => `<a href="/admin?vue=quiz&p=${p}" class="${p === v.period ? "on" : ""}">${p} jours</a>`).join("")}</nav>`;
  if (!t.start && !t.finish && !t.email) {
    return `${v.error ? `<p class="msg msg--err" role="alert">${esc(v.error)}</p>` : ""}${period}
    <p class="empty">Aucun quiz joué sur ${v.period} jours pour le moment.<br><span class="muted">Les statistiques démarrent avec cette version du site : chaque quiz lancé, terminé, chaque email et clic vers le pack sera compté ici.</span></p>`;
  }
  const themeRows = v.themes
    .map(
      (th) => `<tr><th scope="row"><span aria-hidden="true">${th.emoji}</span> ${esc(th.title)}</th>
        <td data-l="Lancés">${th.counts.start}</td><td data-l="Terminés">${th.counts.finish}<span class="muted"> · ${pctOf(th.counts.finish, th.counts.start)}</span></td>
        <td data-l="Emails">${th.counts.email}</td><td data-l="Score moyen">${th.avg === null ? "—" : `${th.avg} %`}</td></tr>`,
    )
    .join("");
  const modeRow = (m: "flash" | "pros", label: string) => {
    const c = v.modes[m];
    return { name: label, value: c.start, label: `${c.start} lancés <span class="muted">· ${pctOf(c.finish, c.start)} terminés</span>` };
  };

  return `${v.error ? `<p class="msg msg--err" role="alert">${esc(v.error)}</p>` : ""}${period}
  <section class="kpis" aria-label="Chiffres clés des quiz">
    ${kpi("Quiz lancés", String(t.start), "", "kpi--hero")}
    ${kpi("Quiz terminés", String(t.finish), `${pctOf(t.finish, t.start)} des quiz lancés`)}
    ${kpi("Emails récupérés", String(t.email), `${pctOf(t.email, t.finish)} des quiz terminés`)}
    ${kpi("Clics vers le pack", String(t.pack), `${pctOf(t.pack, t.finish)} des quiz terminés`)}
  </section>

  <section class="card">
    <header class="card__head"><h2>Quiz lancés par jour</h2><span class="muted">${v.period} jours</span></header>
    ${barChart(
      v.days.map((d) => ({ label: d.label, value: d.start, tip: `${d.label} · ${plural(d.start, "lancé")} · ${plural(d.finish, "terminé")}` })),
      niceCount(Math.max(...v.days.map((d) => d.start))),
      (n) => String(Math.round(n)),
      `Quiz lancés par jour sur ${v.period} jours`,
    )}
  </section>

  <div class="cols">
    <section class="card">
      <header class="card__head"><h2>Parcours</h2><span class="muted">sur les quiz lancés</span></header>
      ${hbars([
        { name: "Quiz lancés", value: t.start, label: String(t.start) },
        { name: "Quiz terminés", value: t.finish, label: `${t.finish} <span class="muted">· ${pctOf(t.finish, t.start)}</span>` },
        { name: "Emails laissés", value: t.email, label: `${t.email} <span class="muted">· ${pctOf(t.email, t.start)}</span>` },
        { name: "Clics vers le pack", value: t.pack, label: `${t.pack} <span class="muted">· ${pctOf(t.pack, t.start)}</span>` },
      ])}
      <p class="hint">« Défier » utilisé ${plural(t.share, "fois", "fois")}.</p>
    </section>
    <section class="card">
      <header class="card__head"><h2>Scores</h2><span class="muted">moyenne ${v.avg === null ? "—" : `${v.avg} %`}</span></header>
      ${hbars(v.scores.map((s) => ({ name: s.label, value: s.count, label: `${s.count} <span class="muted">· ${pctOf(s.count, t.finish)}</span>` })))}
    </section>
  </div>

  <section class="card">
    <header class="card__head"><h2>Par thème</h2></header>
    <div class="table-wrap"><table class="table">
      <thead><tr><th scope="col">Thème</th><th scope="col">Lancés</th><th scope="col">Terminés</th><th scope="col">Emails</th><th scope="col">Score moyen</th></tr></thead>
      <tbody>${themeRows}</tbody>
    </table></div>
  </section>

  <section class="card">
    <header class="card__head"><h2>Flash ou Pros ?</h2></header>
    ${hbars([modeRow("flash", "⚡ Flash Quiz"), modeRow("pros", "🏆 Quiz des Pros")])}
  </section>
  <p class="foot">Statistiques anonymes (aucune donnée personnelle) · un quiz rejoué compte comme un nouveau quiz lancé</p>`;
}

/* ---------- Emails (Resend), regroupés par contact ---------- */

const EMAIL_STATUS: Record<string, [string, string]> = {
  scheduled: ["Programmé", "todo"],
  queued: ["En file", "todo"],
  sent: ["Envoyé", "pdf"],
  delivered: ["Délivré", "ok"],
  opened: ["Ouvert", "ok"],
  clicked: ["Cliqué", "ok"],
  canceled: ["Annulé", "muted"],
  bounced: ["Rejeté", "late"],
  complained: ["Signalé spam", "late"],
  delivery_delayed: ["Retardé", "todo"],
  failed: ["Échec", "late"],
};

const emailTime = (e: AdminEmail) => Date.parse(e.last_event === "scheduled" && e.scheduled_at ? e.scheduled_at : e.created_at);

function emailsSection(v: EmailsView, tab: Tab): string {
  const needle = v.q.trim().toLowerCase();
  const byContact = new Map<string, AdminEmail[]>();
  for (const e of v.emails) {
    const to = (e.to[0] ?? "?").toLowerCase();
    byContact.set(to, [...(byContact.get(to) ?? []), e]);
  }
  const contacts = [...byContact.entries()].map(([to, list]) => {
    const sorted = list.sort((a, b) => emailTime(a) - emailTime(b));
    const pending = sorted.filter((e) => e.last_event === "scheduled").length;
    const stopped = sorted.some((e) => e.last_event === "canceled");
    return { to, list: sorted, pending, stopped, last: Math.max(...sorted.map((e) => Date.parse(e.created_at))) };
  });

  const scheduled = v.emails.filter((e) => e.last_event === "scheduled").length;
  const delivered = v.emails.filter((e) => ["delivered", "opened", "clicked"].includes(e.last_event)).length;
  const opened = v.emails.filter((e) => ["opened", "clicked"].includes(e.last_event)).length;

  const shown = contacts
    .filter((c) => (v.filter === "en-cours" ? c.pending > 0 : v.filter === "arretes" ? c.stopped : true))
    .filter((c) => !needle || `${c.to} ${c.list.map((e) => e.subject).join(" ")}`.toLowerCase().includes(needle))
    .sort((a, b) => b.last - a.last)
    .slice(0, 150);

  const base = (extra: Record<string, string>) => hiddenFields(tab, v.q, { f: v.filter, ...extra });
  const qs = (f: string) => `/admin?vue=emails&f=${f}${v.q ? `&q=${encodeURIComponent(v.q)}` : ""}`;
  const pill = (f: EmailsView["filter"], label: string, n?: number) =>
    `<a href="${esc(qs(f))}" class="${v.filter === f ? "on" : ""}">${esc(label)}${n === undefined ? "" : ` <span>${n}</span>`}</a>`;

  const cards = shown
    .map((c) => {
      const state = c.pending ? ["Séquence en cours", "todo"] : c.stopped ? ["Arrêtée", "muted"] : ["Terminée", "ok"];
      const steps = c.list
        .map((e) => {
          const [label, tone] = EMAIL_STATUS[e.last_event] ?? [e.last_event, "muted"];
          const isSched = e.last_event === "scheduled";
          const t = emailTime(e);
          return `<li class="step step--${tone}">
            <span class="step__dot" aria-hidden="true"></span>
            <span class="step__body"><span class="step__subject">${esc(e.subject)}</span>
              <span class="muted">${esc(label)} · ${isSched ? "prévu " : ""}<time title="${esc(dateTime(t))}">${esc(isSched ? dateTime(t) : ago(t))}</time></span></span>
            ${isSched ? `<form method="post" data-confirm="Annuler cet envoi ?">${base({ action: "annuler-email", email_id: e.id })}<button type="submit" class="link link--danger">Annuler</button></form>` : ""}
          </li>`;
        })
        .join("");
      return `<article class="card contact">
        <header><div><strong>${esc(c.to)}</strong> <span class="badge badge--${state[1]}">${esc(state[0])}</span></div></header>
        <ol class="steps">${steps}</ol>
        <nav class="tools">
          <a href="mailto:${esc(c.to)}">Écrire</a>
          ${c.pending ? `<form method="post" data-confirm="Arrêter la séquence (${c.pending} envoi(s) programmé(s)) ?">${base({ action: "annuler-contact", to: c.to })}<button type="submit" class="link link--danger">Arrêter la séquence</button></form>` : ""}
          <form method="post" class="push" data-confirm="Supprimer ${esc(c.to)} de l'admin ?${c.pending ? " Les envois programmés seront aussi annulés." : ""} (restaurable depuis Réglages)">${base({ action: "masquer", type: "contact", to: c.to })}<button type="submit" class="link link--danger">${icon("trash")} Supprimer</button></form>
        </nav>
      </article>`;
    })
    .join("");

  return `${v.error ? `<p class="msg msg--err" role="alert">${esc(v.error)}</p>` : ""}
  <section class="kpis" aria-label="Emails">
    ${kpi("Contacts", String(contacts.length))}
    ${kpi("Envois programmés", String(scheduled), "", scheduled ? "kpi--todo" : "")}
    ${kpi("Délivrés", String(delivered))}
    ${kpi("Ouverts", String(opened), delivered ? `${Math.round((opened / delivered) * 100)} % des délivrés` : "")}
  </section>
  <nav class="seg" aria-label="Filtre">${pill("en-cours", "En cours", contacts.filter((c) => c.pending).length)}${pill("tous", "Tous", contacts.length)}${pill("arretes", "Arrêtés")}</nav>
  <form class="search" method="get" role="search">
    ${icon("search")}
    <input type="hidden" name="vue" value="emails"><input type="hidden" name="f" value="${v.filter}">
    <input type="search" name="q" value="${esc(v.q)}" placeholder="Email ou sujet…" aria-label="Rechercher un contact">
  </form>
  <section class="list">${cards || `<p class="empty">${v.filter === "en-cours" ? "Aucune séquence en cours." : "Aucun email."}</p>`}</section>
  <p class="foot">500 derniers emails Resend · heures de Paris · « Ouvert » nécessite le suivi d'ouverture activé dans Resend</p>`;
}

/* ---------- Réglages ---------- */

function toggle(name: string, value: string, on: boolean, title: string, help: string): string {
  return `<form method="post" class="switch-row">
      ${hiddenFields("reglages", "", { action: "reglage", cle: name, valeur: on ? "0" : "1", pack: value })}
      <span class="switch-row__text"><strong>${esc(title)}</strong><span class="muted">${esc(help)}</span></span>
      <button type="submit" class="switch ${on ? "switch--on" : ""}" role="switch" aria-checked="${on}" aria-label="${esc(title)}">
        <span class="switch__knob">${on ? "I" : "O"}</span>
      </button>
    </form>`;
}

function bioSection(s: SettingsView, site: SiteInfo): string {
  const linkForm = (l: BioLink, op: string, label: string, cls = "link", confirmMsg = "") =>
    `<form method="post"${confirmMsg ? ` data-confirm="${esc(confirmMsg)}"` : ""}>${hiddenFields("reglages", "", { action: "lien", op, id: l.id })}<button type="submit" class="${cls}" aria-label="${esc(label)}" title="${esc(label)}">${label === "Monter" ? "↑" : label === "Descendre" ? "↓" : esc(label)}</button></form>`;
  const custom = s.links
    .map(
      (l, i) => `<div class="custom-link">
        ${toggle(`lien:${l.id}`, "", l.on, `${l.emoji ? `${l.emoji} ` : ""}${l.label}`, l.url)}
        <div class="custom-link__tools">
          ${i > 0 ? linkForm(l, "monter", "Monter", "mini") : ""}
          ${i < s.links.length - 1 ? linkForm(l, "descendre", "Descendre", "mini") : ""}
          ${linkForm(l, "suppr", "Supprimer", "link link--danger", `Supprimer le bouton « ${l.label} » ?`)}
        </div>
      </div>`,
    )
    .join("");
  return `<section class="card" id="page-de-liens">
    <header class="card__head"><h2>🔗 Page de liens</h2><a class="link" href="${esc(site.url)}/" target="_blank" rel="noreferrer">Voir la page ${icon("external", "ico ico--sm")}</a></header>
    <p class="muted">Ce qui s'affiche sur la page d'accueil (le lien de ta bio). Effet en moins d'une minute.</p>
    ${s.bio.map((b) => toggle(`bio:${b.key}`, "", b.on, b.label, b.help)).join("")}
  </section>

  <section class="card">
    <header class="card__head"><h2>➕ Boutons personnalisés</h2><span class="muted">${s.links.length}/10</span></header>
    <p class="muted">Ajoute tes propres boutons (vidéo YouTube, live, collab, formulaire…). Ils s'affichent sous les packs, dans cet ordre.</p>
    ${custom || `<p class="empty empty--sm">Aucun bouton pour l'instant.</p>`}
    <details class="add-link"${s.links.length ? "" : " open"}>
      <summary class="btn btn--ghost">+ Ajouter un bouton</summary>
      <form method="post" class="stack">
        ${hiddenFields("reglages", "", { action: "lien", op: "ajout" })}
        <div class="add-link__row">
          <label>Emoji <input name="emoji" maxlength="8" placeholder="🎥" autocomplete="off"></label>
          <label>Texte du bouton <input name="label" required maxlength="60" placeholder="Ma dernière vidéo" autocomplete="off"></label>
        </div>
        <label>Adresse <input name="url" required maxlength="500" placeholder="https://… ou /quiz" inputmode="url" autocomplete="off"></label>
        <button type="submit" class="btn">Ajouter</button>
      </form>
    </details>
  </section>`;
}

function settingsSection(s: SettingsView, site: SiteInfo): string {
  const trash = s.hiddenOrders + s.hiddenEmails;
  return `${bioSection(s, site)}

  <section class="card">
    <header class="card__head"><h2>📦 Version papier</h2></header>
    <p class="muted">Sur O : le choix « Papier » disparaît de la page du pack et de la FAQ, et le paiement papier est refusé. Effet en moins d'une minute.</p>
    ${s.print.length ? s.print.map((p) => toggle("papier", p.slug, p.on, p.name, p.on ? "En vente en papier" : "Numérique uniquement")).join("") : `<p class="muted">Aucun pack n'a de version papier.</p>`}
  </section>

  <section class="card">
    <header class="card__head"><h2>📩 Emails du quiz</h2></header>
    <p class="muted">Formulaire « correction + fiche gratuite » en fin de quiz, puis 2 emails espacés (conseils, offre).</p>
    ${toggle("quiz-emails", "", s.quizEmails, "Formulaire en fin de quiz", s.quizEmails ? "Affiché" : "Masqué")}
  </section>

  <section class="card">
    <header class="card__head"><h2>🧹 Données de test</h2></header>
    <p class="muted">Supprime de l'admin les commandes et emails de test (listes et statistiques). Rien n'est effacé chez Stripe ni Resend :
      tout reste restaurable. L'export comptable garde toutes les transactions réelles.</p>
    <div class="danger-zone">
      <div>
        <strong>Repartir de zéro</strong>
        <span class="muted">${s.resetAt ? `Compteurs remis à zéro le ${esc(dateTime(s.resetAt * 1000))} : ce qui précède est ignoré.` : "Ignore les commandes, emails et statistiques de quiz créés jusqu'à maintenant."}</span>
      </div>
      <div class="row">
        ${s.resetAt ? `<form method="post">${hiddenFields("reglages", "", { action: "reset", mode: "annuler" })}<button type="submit" class="btn btn--ghost">Annuler la remise à zéro</button></form>` : ""}
        <form method="post" data-confirm="Remettre tous les compteurs à zéro ? Les commandes et emails existants n'apparaîtront plus dans l'admin (restaurable).">${hiddenFields("reglages", "", { action: "reset", mode: "maintenant" })}<button type="submit" class="btn btn--danger">${s.resetAt ? "Remettre à zéro à nouveau" : "Remettre à zéro"}</button></form>
      </div>
    </div>
    <div class="danger-zone">
      <div>
        <strong>Éléments supprimés</strong>
        <span class="muted">${trash ? `${plural(s.hiddenOrders, "commande")} · ${plural(s.hiddenEmails, "email")}` : "Aucun."} ${s.hiddenOrders ? `<a href="/admin?vue=corbeille">Voir la corbeille</a>` : ""}</span>
      </div>
      ${trash ? `<form method="post" data-confirm="Restaurer tous les éléments supprimés ?">${hiddenFields("reglages", "", { action: "restaurer-tout" })}<button type="submit" class="btn btn--ghost">${icon("undo")} Tout restaurer</button></form>` : ""}
    </div>
  </section>

  <section class="card">
    <header class="card__head"><h2>ℹ️ Le site</h2></header>
    <ul class="facts">
      <li><span>Adresse</span><strong><a href="${esc(site.url)}" target="_blank" rel="noreferrer">${esc(site.url.replace(/^https?:\/\//, ""))}</a></strong></li>
      <li><span>Environnement</span><strong>${site.preprod ? "Préprod" : "Production"}</strong></li>
      <li><span>Paiements Stripe</span><strong>${site.stripeMode === "live" ? "Réels" : site.stripeMode === "test" ? "Mode test" : "?"}</strong></li>
      <li><span>Visible sur Google</span><strong>${site.indexed ? "Oui" : "Non"}</strong></li>
      <li><span>Offre en cours</span><strong>${site.offer ? esc(site.offer) : "aucune"}</strong></li>
    </ul>
    <p class="hint">Indexation et offre : réglées dans le code (src/lib/format.ts, src/content/offer.ts).</p>
  </section>`;
}

/* ---------- Outils ---------- */

function toolsSection(t: Tools): string {
  return `<section class="card">
    <header class="card__head"><h2>📊 Export comptable</h2></header>
    <p class="muted">Toutes les ventes du mois (numérique et papier), remboursements et totaux, pour le livre des recettes. CSV pour Excel, Numbers ou Google Sheets.</p>
    <form method="get" class="row">
      <select name="export" aria-label="Mois">${t.months.map((m) => `<option value="${esc(m.value)}">${esc(m.label)}</option>`).join("")}</select>
      <button type="submit" class="btn">Télécharger</button>
    </form>
  </section>

  <section class="card">
    <header class="card__head"><h2>✨ Envoyer une mise à jour</h2></header>
    <p class="muted">Après avoir remplacé le PDF (et les images) dans Cloudflare R2 : chaque acheteur du pack reçoit ses nouveaux liens (valables 30 jours). Commence par un test.</p>
    <form method="post" class="stack" onsubmit="return this.test.checked || confirm('Envoyer la mise à jour à TOUS les acheteurs de ce pack ?')">
      ${hiddenFields("outils", "", { action: "maj" })}
      <label>Pack
        <select name="pack">${t.packs.map((p) => `<option value="${esc(p.slug)}">${esc(p.name)}</option>`).join("")}</select>
      </label>
      <label>Ce qui a changé <span class="muted">(facultatif, affiché dans l'email)</span>
        <textarea name="message" rows="3" maxlength="1000" placeholder="Ex. : nouvelle fiche sur la douleur, valeurs de la glycémie précisées…"></textarea>
      </label>
      <label class="check"><input type="checkbox" name="test" checked> M'envoyer seulement un test (à ${esc(t.testTo)})</label>
      <button type="submit" class="btn">Envoyer</button>
    </form>
  </section>

  <section class="card">
    <header class="card__head"><h2>📬 Aperçu des emails</h2></header>
    <p class="muted">Reçois un exemple de chacun des ${t.previewCount} emails du site (commande numérique et papier, alerte papier, colis expédié,
      retrouver mon achat, mise à jour, et les 3 emails du quiz), avec une fausse commande « LPI-EXEMPLE ». Aucun client n'est concerné.</p>
    <form method="post" class="row" data-confirm="Envoyer les ${t.previewCount} emails d'exemple ?">
      ${hiddenFields("outils", "", { action: "apercu-emails" })}
      <input type="email" name="to" required value="${esc(t.testTo)}" aria-label="Adresse qui reçoit les exemples" class="row__grow">
      <button type="submit" class="btn">Envoyer</button>
    </form>
  </section>

  <section class="card">
    <header class="card__head"><h2>🔗 Liens utiles</h2></header>
    <ul class="links">
      <li><a href="https://dashboard.stripe.com/payments" target="_blank" rel="noreferrer"><strong>Stripe</strong><span class="muted">Paiements, remboursements, codes promo</span>${icon("external")}</a></li>
      <li><a href="https://resend.com/emails" target="_blank" rel="noreferrer"><strong>Resend</strong><span class="muted">Historique détaillé des emails</span>${icon("external")}</a></li>
      <li><a href="https://dash.cloudflare.com/" target="_blank" rel="noreferrer"><strong>Cloudflare</strong><span class="muted">Fichiers R2, statistiques de visites, secrets</span>${icon("external")}</a></li>
    </ul>
  </section>`;
}

/* ---------- Mise en page ---------- */

type NavId = "accueil" | "quiz" | "commandes" | "emails" | "reglages" | "outils";
const navOf = (t: Tab): NavId => (isOrderTab(t) ? "commandes" : (t as NavId));

const HEADINGS: Record<NavId, [string, string]> = {
  accueil: ["Tableau de bord", ""],
  quiz: ["Quiz", "Combien de quiz joués, terminés, et ce qu'ils rapportent"],
  commandes: ["Commandes", "Expédition, suivi et historique des ventes"],
  emails: ["Emails", "Séquences du quiz et envois programmés"],
  reglages: ["Réglages", "Interrupteurs du site et données de test"],
  outils: ["Outils", "Export comptable, mises à jour, liens"],
};

export function adminPage(d: PageData): string {
  const nav = navOf(d.tab);
  const toShip = d.dashboard?.toShip ?? 0;
  const items: { id: NavId; href: string; label: string; icon: IconName; badge?: number | null }[] = [
    { id: "accueil", href: "/admin", label: "Accueil", icon: "home" },
    { id: "quiz", href: "/admin?vue=quiz", label: "Quiz", icon: "chart" },
    { id: "commandes", href: `/admin?vue=${toShip ? "a-expedier" : "ventes"}`, label: "Commandes", icon: "box", badge: toShip || null },
    { id: "emails", href: "/admin?vue=emails", label: "Emails", icon: "mail", badge: d.scheduled || null },
    { id: "reglages", href: "/admin?vue=reglages", label: "Réglages", icon: "sliders" },
    { id: "outils", href: "/admin?vue=outils", label: "Outils", icon: "tool" },
  ];
  const navLinks = (cls: string) =>
    items
      .map(
        (i) =>
          `<a href="${esc(i.href)}" class="${cls}${i.id === nav ? " on" : ""}"${i.id === nav ? ' aria-current="page"' : ""}>${icon(i.icon)}<span>${esc(i.label)}</span>${i.badge ? `<b class="pill">${i.badge}</b>` : ""}</a>`,
      )
      .join("");

  const [title, sub] = HEADINGS[nav];
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });

  const body =
    nav === "accueil"
      ? dashboardSection(d)
      : nav === "quiz" && d.quiz
        ? quizSection(d.quiz)
        : nav === "commandes"
        ? ordersSection(d)
        : nav === "emails" && d.emails
          ? emailsSection(d.emails, d.tab)
          : nav === "reglages" && d.settings
            ? settingsSection(d.settings, d.site)
            : nav === "outils"
              ? toolsSection(d.tools)
              : "";

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#4E7AC7"><link rel="icon" href="/img/logo-rond-256.webp">
<title>${toShip ? `(${toShip}) ` : ""}${esc(title)} · Admin La Petite IDE</title>
<style>${CSS}</style></head>
<body>
<div class="app">
  <aside class="side">
    <a class="brand" href="/admin"><img src="/img/logo-rond-256.webp" alt="" width="36" height="36"><span>La Petite IDE<small>${d.site.preprod ? "admin · préprod" : "admin"}</small></span></a>
    <nav class="side__nav" aria-label="Sections">${navLinks("nav")}</nav>
    <a class="side__site" href="${esc(d.site.url)}" target="_blank" rel="noreferrer">Voir le site ${icon("external", "ico ico--sm")}</a>
  </aside>

  <main class="main">
    <header class="ph">
      <div>
        ${nav === "accueil" ? `<p class="ph__kicker">${esc(today)}</p>` : ""}
        <h1>${esc(title)}${d.site.preprod ? ' <span class="badge badge--todo">préprod</span>' : ""}</h1>
        ${sub ? `<p class="ph__sub">${esc(sub)}</p>` : ""}
      </div>
      <a class="icon-btn" href="${esc(currentUrl(d))}" aria-label="Actualiser" title="Actualiser">${icon("refresh")}</a>
    </header>

    ${d.error ? `<p class="msg msg--err" role="alert">${esc(d.error)}</p>` : ""}
    ${body}
  </main>
</div>

<nav class="tabbar" aria-label="Sections">${navLinks("tab")}</nav>
${d.notice ? `<div class="toast" role="status"><span>${esc(d.notice)}</span><button type="button" aria-label="Fermer">×</button></div>` : ""}
<div class="tip" role="tooltip" hidden></div>
<script>${SCRIPT}</script>
</body></html>`;
}

function currentUrl(d: PageData): string {
  const p = new URLSearchParams();
  if (d.tab !== "accueil") p.set("vue", d.tab);
  if (d.q) p.set("q", d.q);
  if (d.quiz && d.quiz.period !== 30) p.set("p", String(d.quiz.period));
  if (d.emails && d.emails.filter !== "en-cours") p.set("f", d.emails.filter);
  const s = p.toString();
  return `/admin${s ? `?${s}` : ""}`;
}

const SCRIPT = `
(function () {
  // Nettoie l'adresse après une action (évite de renvoyer le message en actualisant).
  var u = new URL(location.href);
  if (u.searchParams.has("ok") || u.searchParams.has("erreur") || u.searchParams.has("n")) {
    ["ok", "erreur", "n"].forEach(function (k) { u.searchParams.delete(k); });
    history.replaceState(null, "", u.pathname + (u.search || ""));
  }
  var toast = document.querySelector(".toast");
  if (toast) {
    var hide = function () { toast.classList.add("toast--out"); setTimeout(function () { toast.remove(); }, 300); };
    toast.querySelector("button").addEventListener("click", hide);
    setTimeout(hide, 5000);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy]"); if (!b) return;
    navigator.clipboard.writeText(b.getAttribute("data-copy")).then(function () {
      var t = b.textContent; b.textContent = "Copiée ✓"; setTimeout(function () { b.textContent = t; }, 1500);
    });
  });
  document.addEventListener("submit", function (e) {
    var f = e.target, msg = f.getAttribute("data-confirm");
    if (msg && !confirm(msg)) { e.preventDefault(); return; }
    var btn = f.querySelector("button[type=submit]");
    if (btn && !e.defaultPrevented) setTimeout(function () { btn.disabled = true; btn.classList.add("busy"); }, 0);
  });
  // Infobulle du graphique (survol, focus clavier ou toucher).
  var tip = document.querySelector(".tip");
  function show(g) {
    var r = g.getBoundingClientRect();
    tip.textContent = g.getAttribute("data-tip"); tip.hidden = false;
    var w = tip.offsetWidth;
    var x = Math.min(Math.max(r.left + r.width / 2 - w / 2, 8), innerWidth - w - 8);
    tip.style.left = x + "px"; tip.style.top = (r.top + scrollY - tip.offsetHeight - 6) + "px";
  }
  document.querySelectorAll(".col").forEach(function (g) {
    g.addEventListener("mouseenter", function () { show(g); });
    g.addEventListener("focus", function () { show(g); });
    g.addEventListener("click", function () { show(g); });
    g.addEventListener("mouseleave", function () { tip.hidden = true; });
    g.addEventListener("blur", function () { tip.hidden = true; });
  });
})();
`;

const CSS = `
  :root { color-scheme: light;
    --p:#4E7AC7; --p-strong:#3A63AB; --p50:#EEF3FB; --ink:#2D3A5A; --soft:#5B6784; --faint:#8A95B0; --line:#E3E8F2;
    --bg:#F5F7FB; --surface:#fff; --raise:0 1px 2px rgb(45 58 90 / 6%), 0 4px 16px rgb(45 58 90 / 5%);
    --ok:#2F8F6B; --ok50:#E8F5EF; --late:#B8466F; --late50:#FCF0F5; --todo:#A86A12; --todo50:#FDF5E6; --grid:#E9EDF5; --hero1:#4E7AC7; --hero2:#3A63AB; }
  @media (prefers-color-scheme: dark) { :root { color-scheme: dark;
    --p:#7EA3E6; --p-strong:#A7C1F0; --p50:#1F2A44; --ink:#E6EBF5; --soft:#A9B3CB; --faint:#7C87A2; --line:#2A3450;
    --bg:#111726; --surface:#18203A; --raise:0 1px 2px rgb(0 0 0 / 30%);
    --ok:#5CC49A; --ok50:#16332A; --late:#E58AAE; --late50:#3A1D2B; --todo:#E0A94B; --todo50:#3A2E14; --grid:#26304A; --hero1:#35589A; --hero2:#26427A; } }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  a { color:var(--p); }
  button, input, select, textarea { font:inherit; color:inherit; }
  button { cursor:pointer; }
  code { font-size:.85em; background:var(--p50); padding:1px 5px; border-radius:6px; }
  .ico { width:20px; height:20px; flex:none; }
  .ico--sm { width:14px; height:14px; vertical-align:-2px; }

  /* Mise en page */
  .app { display:block; }
  .side { display:none; }
  .main { max-width:880px; margin:0 auto; padding:18px 16px calc(96px + env(safe-area-inset-bottom)); }
  @media (min-width:900px) {
    .app { display:grid; grid-template-columns:240px minmax(0,1fr); min-height:100vh; }
    .side { display:flex; flex-direction:column; gap:20px; position:sticky; top:0; height:100vh; padding:22px 14px; background:var(--surface); border-right:1px solid var(--line); }
    .main { padding:32px 40px 60px; margin:0; max-width:1000px; width:100%; }
    .tabbar { display:none !important; }
  }
  .brand { display:flex; align-items:center; gap:10px; text-decoration:none; color:var(--ink); font-weight:800; padding:0 8px; }
  .brand img { border-radius:50%; }
  .brand small { display:block; font-weight:600; font-size:.72rem; color:var(--faint); letter-spacing:.02em; }
  .side__nav { display:grid; gap:2px; }
  .nav { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:12px; text-decoration:none; color:var(--soft); font-weight:600; }
  .nav:hover { background:var(--bg); color:var(--ink); }
  .nav.on { background:var(--p50); color:var(--p-strong); }
  .nav .pill { margin-left:auto; }
  .side__site { margin-top:auto; padding:10px 12px; color:var(--soft); text-decoration:none; font-size:.88rem; font-weight:600; }
  .pill { display:inline-grid; place-items:center; min-width:20px; height:20px; padding:0 6px; border-radius:99px; background:var(--late); color:#fff; font-size:.7rem; font-weight:800; }

  .tabbar { position:fixed; z-index:20; left:0; right:0; bottom:0; display:grid; grid-template-columns:repeat(6,1fr); padding:6px 6px calc(6px + env(safe-area-inset-bottom));
    background:color-mix(in srgb, var(--surface) 92%, transparent); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border-top:1px solid var(--line); }
  .tab { position:relative; display:grid; justify-items:center; gap:2px; padding:6px 2px; border-radius:12px; text-decoration:none; color:var(--faint); font-size:.68rem; font-weight:700; }
  .tab .ico { width:22px; height:22px; }
  .tab.on { color:var(--p); }
  .tab.on .ico { background:var(--p50); border-radius:10px; padding:2px; width:34px; margin:-2px 0; }
  .tab .pill { position:absolute; top:2px; left:calc(50% + 6px); min-width:18px; height:18px; font-size:.65rem; }

  .ph { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:18px; }
  .ph__kicker { margin:0 0 2px; font-size:.82rem; font-weight:700; color:var(--p); }
  .ph__kicker::first-letter { text-transform:uppercase; }
  h1 { margin:0; font-size:1.7rem; line-height:1.15; letter-spacing:-.01em; }
  .ph__sub { margin:4px 0 0; color:var(--soft); font-size:.9rem; }
  .icon-btn { display:grid; place-items:center; width:42px; height:42px; flex:none; border-radius:12px; background:var(--surface); border:1px solid var(--line); color:var(--soft); box-shadow:var(--raise); }
  .icon-btn:hover { color:var(--p); }

  /* Cartes */
  .card { background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:16px; margin-bottom:12px; box-shadow:var(--raise); }
  .card__head { display:flex; justify-content:space-between; align-items:baseline; gap:10px; margin-bottom:10px; }
  .card__head h2 { margin:0; font-size:1rem; }
  .card > .muted { margin:0 0 12px; }
  .cols { display:grid; gap:12px; }
  .cols .card { margin:0; }
  .cols { margin-bottom:12px; }
  @media (min-width:700px) { .cols { grid-template-columns:1fr 1fr; } }
  .muted { color:var(--soft); font-size:.86rem; }
  .hint { margin:10px 0 0; color:var(--faint); font-size:.8rem; }
  .empty { background:var(--surface); border:1.5px dashed var(--line); border-radius:18px; padding:28px 20px; text-align:center; color:var(--soft); margin:0; }
  .foot { margin-top:18px; text-align:center; font-size:.76rem; color:var(--faint); }

  /* Tableau de bord */
  .alert { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:12px 16px; margin-bottom:12px; border-radius:16px; background:var(--todo50); color:var(--todo); text-decoration:none; font-size:.95rem; }
  .alert--late { background:var(--late50); color:var(--late); }
  .kpis { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-bottom:12px; }
  @media (min-width:700px) { .kpis { grid-template-columns:repeat(4,minmax(0,1fr)); } }
  .kpi { background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:14px; display:grid; gap:2px; align-content:start; box-shadow:var(--raise); min-width:0; }
  .kpi__label { font-size:.78rem; font-weight:600; color:var(--soft); }
  .kpi__value { font-size:1.5rem; font-weight:800; letter-spacing:-.01em; font-variant-numeric:tabular-nums; }
  .kpi__foot { font-size:.75rem; color:var(--faint); }
  .kpi--hero { background:linear-gradient(135deg, var(--hero1), var(--hero2)); border-color:transparent; }
  .kpi--hero .kpi__label, .kpi--hero .kpi__value, .kpi--hero .kpi__foot, .kpi--hero .delta { color:#fff; }
  .kpi--hero .delta { opacity:.85; }
  .kpi--todo .kpi__value { color:var(--todo); }
  .delta { font-size:.75rem; font-weight:600; color:var(--faint); }
  .delta--up { color:var(--ok); } .delta--down { color:var(--late); }

  .chart { display:block; width:100%; height:auto; overflow:visible; }
  .chart .grid { stroke:var(--grid); stroke-width:1; }
  .chart .grid--base { stroke:var(--line); }
  .chart .axis { fill:var(--faint); font-size:12px; font-variant-numeric:tabular-nums; }
  @media (max-width:640px) { .chart .axis { font-size:20px; } }
  .chart .bar { fill:var(--p); }
  .chart .hit { fill:transparent; }
  .chart .col { outline:none; cursor:default; }
  .chart .col:hover .bar, .chart .col:focus .bar { fill:var(--p-strong); }
  .chart .col:hover .hit, .chart .col:focus .hit { fill:var(--p50); opacity:.6; }
  .tip { position:absolute; z-index:30; pointer-events:none; background:var(--ink); color:var(--surface); font-size:.78rem; font-weight:600; padding:6px 10px; border-radius:9px; white-space:nowrap; }

  .hbars { list-style:none; margin:0; padding:0; display:grid; gap:10px; }
  .hbars li { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px 10px; align-items:center; }
  .hbars__name { font-weight:600; font-size:.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .hbars__val { font-size:.85rem; font-variant-numeric:tabular-nums; text-align:right; }
  .hbars__track { grid-column:1 / -1; height:8px; border-radius:99px; background:var(--bg); overflow:hidden; }
  .hbars__fill { display:block; height:100%; border-radius:99px; background:var(--p); }

  .seg--inline { display:inline-flex; margin-bottom:12px; }
  .seg--inline a { flex:0 0 auto; }
  .table-wrap { overflow-x:auto; margin:0 -4px; }
  .table { width:100%; border-collapse:collapse; font-size:.88rem; font-variant-numeric:tabular-nums; }
  .table th, .table td { padding:9px 6px; text-align:right; border-top:1px solid var(--line); white-space:nowrap; }
  .table thead th { border-top:0; font-size:.74rem; font-weight:700; color:var(--faint); text-transform:uppercase; letter-spacing:.03em; }
  .table th:first-child { text-align:left; white-space:normal; }
  .table tbody th { font-weight:600; }
  @media (max-width:600px) {
    .table thead { display:none; }
    .table tr { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:4px 8px; padding:10px 4px; border-top:1px solid var(--line); }
    .table tbody tr:first-child { border-top:0; }
    .table th, .table td { border:0; padding:0; text-align:left; white-space:normal; }
    .table tbody th { grid-column:1 / -1; }
    .table td { display:grid; font-weight:700; }
    .table td::before { content:attr(data-l); font-size:.7rem; font-weight:600; color:var(--faint); }
    .table td .muted { font-size:.72rem; font-weight:500; }
  }
  .facts { list-style:none; margin:0; padding:0; }
  .facts li { display:flex; justify-content:space-between; gap:12px; padding:9px 0; border-top:1px solid var(--line); font-size:.9rem; }
  .facts li:first-child { border-top:0; padding-top:0; }
  .facts span { color:var(--soft); }
  .facts strong { text-align:right; }

  .rows { list-style:none; margin:0; padding:0; }
  .rows li + li { border-top:1px solid var(--line); }
  .rows a { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:10px 4px; text-decoration:none; color:inherit; border-radius:10px; }
  .rows a:hover { background:var(--bg); }
  .rows__main { display:grid; min-width:0; }
  .rows__main .muted { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:.8rem; }
  .rows__side { display:grid; justify-items:end; gap:2px; font-weight:700; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .rows__side .badge { margin:0; }

  /* Listes, filtres, recherche */
  .seg { display:flex; gap:4px; padding:4px; background:var(--surface); border:1px solid var(--line); border-radius:14px; margin-bottom:10px; overflow-x:auto; scrollbar-width:none; }
  .seg a { flex:1 0 auto; white-space:nowrap; text-align:center; padding:8px 10px; border-radius:10px; text-decoration:none; color:var(--soft); font-weight:600; font-size:.84rem; }
  .seg a span { display:inline-block; min-width:18px; padding:0 5px; border-radius:99px; background:var(--bg); font-size:.72rem; margin-left:2px; }
  .seg a.on { background:var(--p); color:#fff; } .seg a.on span { background:rgb(255 255 255 / 25%); }
  .search { position:relative; display:flex; gap:10px; align-items:center; margin-bottom:12px; }
  .search .ico { position:absolute; left:13px; color:var(--faint); width:18px; height:18px; }
  .search input { flex:1; min-width:0; padding:11px 14px 11px 40px; border:1.5px solid var(--line); border-radius:14px; background:var(--surface); }
  input:focus, select:focus, textarea:focus { outline:none; border-color:var(--p) !important; box-shadow:0 0 0 3px var(--p50); }
  .bulk { display:block; text-align:center; padding:10px; margin-bottom:12px; border:1.5px dashed var(--p); border-radius:14px; text-decoration:none; font-weight:600; background:var(--p50); }

  .order { border-left:4px solid var(--line); }
  .order--todo { border-left-color:var(--todo); } .order--late { border-left-color:var(--late); }
  .order--shipped { border-left-color:var(--ok); } .order--pdf { border-left-color:var(--p); } .order--refunded { opacity:.7; }
  .order header, .contact header { display:flex; justify-content:space-between; align-items:center; gap:8px; }
  .order header > div, .contact header > div { min-width:0; overflow-wrap:anywhere; }
  .order time { font-size:.8rem; color:var(--faint); white-space:nowrap; }
  .order p { margin:6px 0 0; }
  .ref { font-variant-numeric:tabular-nums; }
  .pack { font-weight:600; } .pack em { font-style:normal; color:var(--p); }
  .chip { display:inline-block; padding:0 7px; border-radius:99px; background:var(--p50); color:var(--p-strong); font-size:.78rem; font-weight:600; }
  .badge { display:inline-block; font-size:.7rem; font-weight:700; padding:1px 8px; border-radius:99px; margin-left:6px; vertical-align:1px; white-space:nowrap; }
  .badge--todo { background:var(--todo50); color:var(--todo); } .badge--late { background:var(--late50); color:var(--late); }
  .badge--ok { background:var(--ok50); color:var(--ok); } .badge--pdf { background:var(--p50); color:var(--p-strong); }
  .badge--muted { background:var(--bg); color:var(--soft); }
  .addr { margin-top:10px; padding:10px 12px; background:var(--bg); border-radius:12px; font-size:.95rem; line-height:1.45; }
  .warn { padding:8px 12px; background:var(--late50); color:var(--late); border-radius:10px; font-size:.86rem; }
  .ship { display:flex; gap:8px; margin-top:12px; }
  .ship input { flex:1; min-width:0; padding:10px 12px; border:1.5px solid var(--line); border-radius:12px; background:var(--surface); text-transform:uppercase; }
  .shipped { margin-top:10px; padding:8px 12px; background:var(--ok50); border-radius:12px; font-size:.9rem; }
  .shipped p { margin:0; }
  .fix summary { cursor:pointer; color:var(--soft); font-size:.82rem; margin-top:4px; }
  .fix form { margin-top:8px; }
  .tools { display:flex; flex-wrap:wrap; align-items:center; gap:6px 16px; margin-top:12px; padding-top:10px; border-top:1px solid var(--line); font-size:.85rem; }
  .tools a { text-decoration:none; font-weight:600; }
  .tools form { display:inline; margin:0; }
  .tools .push { margin-left:auto; }
  .link { display:inline-flex; align-items:center; gap:4px; border:0; background:none; padding:0; color:var(--p); font-size:inherit; font-weight:600; text-decoration:none; }
  .link .ico { width:16px; height:16px; }
  .link--danger { color:var(--late); }

  /* Emails : séquence par contact */
  .steps { list-style:none; margin:12px 0 0; padding:0; }
  .step { position:relative; display:flex; align-items:flex-start; gap:12px; padding:0 0 12px; }
  .step:last-child { padding-bottom:0; }
  .step:not(:last-child)::before { content:""; position:absolute; left:5px; top:16px; bottom:0; width:2px; background:var(--line); }
  .step__dot { flex:none; width:12px; height:12px; margin-top:5px; border-radius:50%; background:var(--faint); box-shadow:0 0 0 3px var(--surface); }
  .step--ok .step__dot { background:var(--ok); } .step--todo .step__dot { background:var(--surface); border:2px solid var(--todo); }
  .step--late .step__dot { background:var(--late); } .step--pdf .step__dot { background:var(--p); }
  .step__body { flex:1; min-width:0; display:grid; }
  .step__subject { font-weight:600; font-size:.9rem; overflow-wrap:anywhere; }
  .step form { margin:2px 0 0; font-size:.82rem; }

  /* Boutons, formulaires */
  .btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:10px 16px; border:0; border-radius:12px; background:var(--p); color:#fff; font-weight:700; white-space:nowrap; }
  .btn:hover { background:var(--p-strong); }
  .btn--ghost { background:var(--surface); color:var(--ink); border:1.5px solid var(--line); }
  .btn--ghost:hover { background:var(--bg); }
  .btn--danger { background:var(--late); }
  .btn--danger:hover { background:var(--late); filter:brightness(.92); }
  .btn .ico { width:16px; height:16px; }
  button:disabled, .busy { opacity:.6; cursor:progress; }
  .row { display:flex; flex-wrap:wrap; gap:8px; }
  .row form { margin:0; }
  .row__grow { flex:1 1 200px; min-width:0; padding:10px 12px; border:1.5px solid var(--line); border-radius:12px; background:var(--surface); }
  .stack { display:grid; gap:12px; }
  .stack label { display:grid; gap:6px; font-weight:600; font-size:.9rem; }
  .stack label .muted { font-weight:400; }
  .stack label.check { display:flex; align-items:center; gap:8px; font-weight:500; }
  .card select, .card textarea { flex:1; min-width:0; padding:10px 12px; border:1.5px solid var(--line); border-radius:12px; background:var(--surface); }
  .card textarea { resize:vertical; }

  .switch-row { display:flex; align-items:center; gap:12px; padding:12px 0; margin:0; border-top:1px solid var(--line); }
  .switch-row:first-of-type { border-top:0; padding-top:4px; }
  .switch-row__text { flex:1; display:grid; gap:2px; }
  .switch-row__text .muted { font-size:.82rem; }
  .switch { position:relative; width:64px; height:34px; padding:0; border:0; border-radius:99px; background:var(--line); flex:none; transition:background .2s; }
  .switch--on { background:var(--ok); }
  .switch__knob { position:absolute; top:3px; left:3px; width:28px; height:28px; border-radius:50%; background:#fff; color:#5B6784; font-weight:800; font-size:.8rem; display:grid; place-items:center; box-shadow:0 1px 3px rgb(0 0 0 / 25%); transition:left .2s; }
  .switch--on .switch__knob { left:33px; color:#2F8F6B; }

  .custom-link { border-top:1px solid var(--line); }
  .custom-link .switch-row { border-top:0; padding-bottom:4px; }
  .custom-link .switch-row__text .muted { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .custom-link__tools { display:flex; gap:6px; align-items:center; justify-content:flex-end; padding-bottom:10px; font-size:.82rem; }
  .custom-link__tools form { margin:0; }
  .custom-link__tools .link--danger { margin-left:8px; }
  .mini { width:30px; height:30px; border-radius:9px; border:1.5px solid var(--line); background:var(--surface); color:var(--soft); font-weight:800; }
  .mini:hover { color:var(--p); border-color:var(--p); }
  .empty--sm { padding:14px; font-size:.88rem; margin-bottom:12px; }
  .add-link { margin-top:12px; }
  .add-link summary { list-style:none; width:100%; }
  .add-link summary::-webkit-details-marker { display:none; }
  .add-link[open] summary { display:none; }
  .add-link__row { display:grid; grid-template-columns:90px minmax(0,1fr); gap:10px; }
  .stack input { padding:10px 12px; border:1.5px solid var(--line); border-radius:12px; background:var(--surface); font-weight:400; min-width:0; }
  .danger-zone { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px 16px; padding:12px 0; border-top:1px solid var(--line); }
  .danger-zone > div:first-child { display:grid; gap:2px; flex:1 1 240px; }

  .links { list-style:none; margin:0; padding:0; }
  .links li + li { border-top:1px solid var(--line); }
  .links a { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:0 10px; padding:10px 4px; text-decoration:none; color:inherit; }
  .links a .muted { grid-column:1; }
  .links a .ico { grid-row:1 / span 2; grid-column:2; color:var(--faint); }

  .msg { padding:11px 14px; border-radius:14px; margin:0 0 14px; font-size:.92rem; }
  .msg--err { background:var(--late50); color:var(--late); }
  .toast { position:fixed; z-index:40; left:50%; top:16px; transform:translateX(-50%); display:flex; align-items:center; gap:12px; max-width:calc(100% - 32px);
    padding:12px 12px 12px 16px; border-radius:14px; background:var(--ink); color:var(--surface); font-weight:600; font-size:.9rem; box-shadow:0 10px 30px rgb(0 0 0 / 25%); animation:toast-in .25s ease-out; transition:opacity .3s, transform .3s; }
  .toast button { border:0; background:none; color:inherit; font-size:1.2rem; line-height:1; opacity:.7; padding:0 4px; }
  .toast--out { opacity:0; transform:translate(-50%, -10px); }
  @keyframes toast-in { from { opacity:0; transform:translate(-50%, -10px); } }
  @media (prefers-reduced-motion: reduce) { * { animation:none !important; transition:none !important; } }
`;

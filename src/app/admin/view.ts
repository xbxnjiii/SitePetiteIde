import { SHIPPING } from "@/content/shipping";
import { LEGAL, formatPrice } from "@/lib/format";
import { type AdminOrder, type Stats, statusOf } from "./data";

// Rendu HTML de la page /admin (pas de React : une page légère, rendue côté serveur).

export type Tab = "a-expedier" | "expediees" | "ventes" | "outils";

export const TABS: { id: Tab; label: string }[] = [
  { id: "a-expedier", label: "À expédier" },
  { id: "expediees", label: "Expédiées" },
  { id: "ventes", label: "Ventes" },
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
    ${TABS.map((t) => `<a href="${esc(qs(t.id))}" class="${t.id === tab ? "on" : ""}"${t.id === tab ? ' aria-current="page"' : ""}>${esc(t.label)} ${t.id === "outils" ? "" : `<span>${opts.counts[t.id]}</span>`}</a>`).join("")}
  </nav>

  ${tab === "outils" ? toolsSection(opts.tools) : `  <form class="search" method="get" role="search">
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
  .tabs { display:flex; gap:4px; padding:4px; background:#fff; border:1px solid var(--line); border-radius:14px; margin-bottom:10px; overflow-x:auto; }
  .tabs a { flex:1 1 auto; white-space:nowrap; text-align:center; padding:8px 4px; border-radius:10px; text-decoration:none; color:var(--soft); font-weight:600; font-size:.84rem; }
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
  .foot { margin-top:20px; text-align:center; font-size:.78rem; color:var(--soft); }
`;

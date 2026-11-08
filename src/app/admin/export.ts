import type { AdminOrder } from "./data";

// Export comptable (livre des recettes) au format CSV compatible Excel :
// séparateur « ; », virgule décimale, BOM UTF-8 pour les accents.

const euros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

const cell = (v: string) => (/[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

const day = (unix: number) =>
  new Date(unix * 1000).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" });

const HEADER = [
  "Date",
  "Référence",
  "Client",
  "Nature",
  "Produit",
  "Montant TTC",
  "Dont frais de port",
  "Remise",
  "Remboursé",
  "Net encaissé",
  "Mode de règlement",
  "Provenance",
];

export function ordersCsv(orders: AdminOrder[]): string {
  const rows = orders.map((o) => [
    day(o.createdAt),
    o.reference,
    o.email,
    o.format === "papier" ? "Vente de marchandises (papier)" : "Contenu numérique",
    o.packName,
    euros(o.amountCents),
    euros(o.shippingCents),
    euros(o.discountCents),
    euros(o.refundedCents),
    euros(o.amountCents - o.refundedCents),
    "Carte bancaire (Stripe)",
    o.provenance,
  ]);

  const sum = (pick: (o: AdminOrder) => number, filter: (o: AdminOrder) => boolean = () => true) =>
    euros(orders.filter(filter).reduce((t, o) => t + pick(o), 0));
  const net = (o: AdminOrder) => o.amountCents - o.refundedCents;
  const totals = [
    [],
    ["TOTAL", "", "", "", `${orders.length} commande(s)`, sum((o) => o.amountCents), sum((o) => o.shippingCents), sum((o) => o.discountCents), sum((o) => o.refundedCents), sum(net)],
    ["Dont contenu numérique", "", "", "", "", "", "", "", "", sum(net, (o) => o.format !== "papier")],
    ["Dont ventes de marchandises", "", "", "", "", "", "", "", "", sum(net, (o) => o.format === "papier")],
  ];

  return "﻿" + [HEADER, ...rows, ...totals].map((r) => r.map((v) => cell(String(v))).join(";")).join("\r\n") + "\r\n";
}

/** « 2026-11 » → bornes du mois (heure de Paris), en secondes Unix. */
export function monthBounds(month: string): { from: number; to: number; label: string } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  return {
    from: parisMidnight(y, mo, 1),
    to: mo === 12 ? parisMidnight(y + 1, 1, 1) : parisMidnight(y, mo + 1, 1),
    label: new Date(Date.UTC(y, mo - 1, 15)).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

/** Minuit (heure de Paris) du jour donné, en secondes Unix. */
function parisMidnight(y: number, m: number, d: number): number {
  const utc = Date.UTC(y, m - 1, d);
  // Décalage de Paris à cette date (+1 h l'hiver, +2 h l'été).
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(utc));
  const offsetHours = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  return Math.floor(utc / 1000) - offsetHours * 3600;
}

/** Les 12 derniers mois (« 2026-11 », « 2026-10 »…), le mois en cours en premier. */
export function lastMonths(count = 12, now = new Date()): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" }).formatToParts(now);
  let y = Number(parts.find((p) => p.type === "year")?.value);
  let m = Number(parts.find((p) => p.type === "month")?.value);
  for (let i = 0; i < count; i++) {
    const value = `${y}-${String(m).padStart(2, "0")}`;
    out.push({ value, label: monthBounds(value)!.label });
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}

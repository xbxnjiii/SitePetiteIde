import type Stripe from "stripe";
import { getPack, parseFormat, type PackFormat } from "@/content/packs";
import { orderReference, shippingInfo } from "@/lib/orders";

// Lecture des commandes pour la page /admin. Tout vient de Stripe (aucune base de données) :
// l'état « expédiée » et le numéro de suivi sont des métadonnées du PaymentIntent.

export const SHIPPED_AT = "lpi_expedie_le";
export const TRACKING = "lpi_suivi";
/** Commande papier « en retard » au-delà de ce nombre de jours ouvrés sans expédition. */
export const LATE_AFTER_BUSINESS_DAYS = 2;
/** Nombre maximum de commandes lues dans Stripe (les plus récentes). */
const MAX_ORDERS = 300;

export interface AdminOrder {
  id: string;
  reference: string;
  createdAt: number;
  format: PackFormat;
  packName: string;
  amountCents: number;
  shippingCents: number;
  discountCents: number;
  email: string;
  /** Nom du destinataire (papier) ou du client. */
  name: string;
  /** Adresse de livraison (papier) ; vide pour un PDF. */
  lines: string[];
  deliverable: boolean;
  shippedAt: string | null;
  tracking: string | null;
  refunded: boolean;
  provenance: string;
  /** Lien vers le paiement dans le tableau de bord Stripe. */
  stripeUrl: string | null;
  /** Jours ouvrés écoulés depuis la commande. */
  businessDaysOld: number;
}

export type OrderStatus = "todo" | "late" | "shipped" | "refunded" | "pdf";

export function statusOf(o: AdminOrder): OrderStatus {
  if (o.refunded) return "refunded";
  if (o.format === "pdf") return "pdf";
  if (o.shippedAt) return "shipped";
  return o.businessDaysOld > LATE_AFTER_BUSINESS_DAYS ? "late" : "todo";
}

/** Commandes payées les plus récentes (PDF et papier). */
export async function listOrders(stripe: Stripe): Promise<AdminOrder[]> {
  const orders: AdminOrder[] = [];
  const now = Date.now();
  for await (const s of stripe.checkout.sessions.list({
    status: "complete",
    limit: 100,
    expand: ["data.payment_intent.latest_charge"],
  })) {
    if (orders.length >= MAX_ORDERS) break;
    if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required") continue;
    const pi = s.payment_intent as Stripe.PaymentIntent | null;
    const charge = (pi?.latest_charge ?? null) as Stripe.Charge | null;
    const ship = shippingInfo(s);
    const format = parseFormat(s.metadata?.format);
    orders.push({
      id: s.id,
      reference: orderReference(s.id),
      createdAt: s.created,
      format,
      packName: getPack(s.metadata?.pack ?? "")?.name ?? s.metadata?.pack ?? "?",
      amountCents: s.amount_total ?? 0,
      shippingCents: s.total_details?.amount_shipping ?? 0,
      discountCents: s.total_details?.amount_discount ?? 0,
      email: s.customer_details?.email ?? "",
      name: ship?.name || s.customer_details?.name || "",
      lines: format === "papier" ? (ship?.lines ?? ["⚠️ Adresse absente : voir Stripe"]) : [],
      deliverable: format === "papier" ? (ship?.deliverable ?? false) : true,
      shippedAt: pi?.metadata?.[SHIPPED_AT] || null,
      tracking: pi?.metadata?.[TRACKING] || null,
      refunded: Boolean(charge?.refunded),
      provenance: s.metadata?.provenance ?? "direct",
      stripeUrl: pi ? `https://dashboard.stripe.com/${s.livemode ? "" : "test/"}payments/${pi.id}` : null,
      businessDaysOld: businessDaysBetween(s.created * 1000, now),
    });
  }
  return orders;
}

/** Nombre de jours ouvrés (lundi–vendredi) entièrement écoulés entre deux instants. */
export function businessDaysBetween(fromMs: number, toMs: number): number {
  let days = 0;
  const d = new Date(fromMs);
  d.setUTCDate(d.getUTCDate() + 1);
  while (d.getTime() <= toMs) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) days++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

export interface Stats {
  toShip: number;
  late: number;
  shippedThisMonth: number;
  monthOrders: number;
  monthPrint: number;
  monthRevenueCents: number;
  monthLabel: string;
}

export function computeStats(orders: AdminOrder[], now = new Date()): Stats {
  const paris = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" });
  const monthKey = (d: Date) => paris.format(d);
  const current = monthKey(now);
  const month = orders.filter((o) => !o.refunded && monthKey(new Date(o.createdAt * 1000)) === current);
  return {
    toShip: orders.filter((o) => ["todo", "late"].includes(statusOf(o))).length,
    late: orders.filter((o) => statusOf(o) === "late").length,
    shippedThisMonth: orders.filter((o) => o.shippedAt && monthKey(new Date(o.shippedAt)) === current).length,
    monthOrders: month.length,
    monthPrint: month.filter((o) => o.format === "papier").length,
    monthRevenueCents: month.reduce((sum, o) => sum + o.amountCents, 0),
    monthLabel: now.toLocaleDateString("fr-FR", { month: "long", timeZone: "Europe/Paris" }),
  };
}

/** Recherche simple : référence, email, nom, adresse, pack. */
export function matches(o: AdminOrder, q: string): boolean {
  const needle = normalize(q);
  if (!needle) return true;
  return normalize([o.reference, o.email, o.name, o.packName, o.format, o.tracking ?? "", ...o.lines].join(" ")).includes(needle);
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

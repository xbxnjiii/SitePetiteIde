import { type AdminOrder, statusOf } from "./data";

// Chiffres du tableau de bord /admin, calculés à partir des commandes Stripe déjà chargées.

export interface DayPoint {
  key: string; // AAAA-MM-JJ (Paris)
  label: string; // « 8 nov. »
  cents: number;
  count: number;
}

export interface Dashboard {
  monthLabel: string;
  prevMonthLabel: string;
  revenue: number;
  revenuePrev: number;
  orders: number;
  ordersPrev: number;
  avgBasket: number;
  today: { orders: number; cents: number };
  toShip: number;
  late: number;
  /** 30 derniers jours, du plus ancien au plus récent. */
  days: DayPoint[];
  /** Provenance des ventes (30 derniers jours), la plus forte en premier. */
  sources: { name: string; count: number; cents: number }[];
  formats: { pdf: number; papier: number };
  promoOrders: number;
  refunds: number;
  recent: AdminOrder[];
}

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
const monthKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" });
const dayLabel = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
const monthName = (d: Date) => d.toLocaleDateString("fr-FR", { month: "long", timeZone: "Europe/Paris" });

const net = (o: AdminOrder) => o.amountCents - o.refundedCents;

export function buildDashboard(orders: AdminOrder[], now = new Date()): Dashboard {
  const live = orders.filter((o) => !o.refunded);
  const thisMonth = monthKey.format(now);
  const prevDate = new Date(now);
  prevDate.setUTCDate(1);
  prevDate.setUTCMonth(prevDate.getUTCMonth() - 1);
  const prevMonth = monthKey.format(prevDate);
  // Mois précédent comparé à la même date (ex. 1er → 8 octobre vs 1er → 8 novembre).
  const dayOfMonth = Number(dayKey.format(now).slice(8, 10));

  const inMonth = live.filter((o) => monthKey.format(new Date(o.createdAt * 1000)) === thisMonth);
  const inPrev = live.filter((o) => {
    const d = new Date(o.createdAt * 1000);
    return monthKey.format(d) === prevMonth && Number(dayKey.format(d).slice(8, 10)) <= dayOfMonth;
  });

  const days: DayPoint[] = [];
  const byKey = new Map<string, DayPoint>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const p = { key: dayKey.format(d), label: dayLabel(d), cents: 0, count: 0 };
    days.push(p);
    byKey.set(p.key, p);
  }
  const last30 = live.filter((o) => byKey.has(dayKey.format(new Date(o.createdAt * 1000))));
  for (const o of last30) {
    const p = byKey.get(dayKey.format(new Date(o.createdAt * 1000)))!;
    p.cents += net(o);
    p.count += 1;
  }

  const sourceMap = new Map<string, { name: string; count: number; cents: number }>();
  for (const o of last30) {
    const s = sourceMap.get(o.provenance) ?? { name: o.provenance, count: 0, cents: 0 };
    s.count += 1;
    s.cents += net(o);
    sourceMap.set(o.provenance, s);
  }

  const todayKey = dayKey.format(now);
  const today = byKey.get(todayKey)!;
  const revenue = inMonth.reduce((t, o) => t + net(o), 0);

  return {
    monthLabel: monthName(now),
    prevMonthLabel: monthName(prevDate),
    revenue,
    revenuePrev: inPrev.reduce((t, o) => t + net(o), 0),
    orders: inMonth.length,
    ordersPrev: inPrev.length,
    avgBasket: inMonth.length ? Math.round(revenue / inMonth.length) : 0,
    today: { orders: today.count, cents: today.cents },
    toShip: orders.filter((o) => ["todo", "late"].includes(statusOf(o))).length,
    late: orders.filter((o) => statusOf(o) === "late").length,
    days,
    sources: [...sourceMap.values()].sort((a, b) => b.cents - a.cents || b.count - a.count),
    formats: { pdf: last30.filter((o) => o.format !== "papier").length, papier: last30.filter((o) => o.format === "papier").length },
    promoOrders: inMonth.filter((o) => o.discountCents > 0).length,
    refunds: orders.filter((o) => o.refunded && monthKey.format(new Date(o.createdAt * 1000)) === thisMonth).length,
    recent: [...orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
  };
}

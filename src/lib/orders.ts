import "server-only";
import type Stripe from "stripe";
import { FORMAT_LABEL, getPack, isPhysical, type Pack } from "@/content/packs";
import { type CartLine, cleanCart, decodeCart, isFullPack } from "./cart";
import { type Carrier, type RelayPoint, type ShippingMethod, getShippingMethod, isDeliverable, methodName } from "@/content/shipping";
import { SITE } from "./format";
import { type AppEnv, requireVar, siteUrl } from "./env";
import { signDownloadToken } from "./download-token";

// Les commandes ne sont stockées QUE chez Stripe : c'est la source de vérité.

export interface ShippingInfo {
  name: string;
  /** Adresse sur plusieurs lignes (domicile), ou point relais avec son identifiant. */
  lines: string[];
  /** `false` si l'adresse est hors France métropolitaine (à vérifier avant l'envoi). */
  deliverable: boolean;
  /** Mode de livraison choisi (null : ancienne commande « Lettre suivie La Poste »). */
  method: ShippingMethod | null;
  carrier: Carrier | null;
  relay: RelayPoint | null;
  phone: string | null;
  /** Code postal de livraison (suivi Mondial Relay). */
  postalCode: string | null;
}

/** Livraison complète sur plusieurs lignes (emails, admin) : mode, adresse ou point relais, téléphone. */
export const shippingSummary = (s: ShippingInfo): string[] => [
  ...(s.method ? [methodName(s.method)] : []),
  ...s.lines,
  ...(s.phone ? [`Tél. ${s.phone}`] : []),
];

/** Accès numérique donné par la commande pour un pack : pack complet (PDF + images) ou certaines fiches. */
export interface PackAccess {
  pack: Pack;
  /** Pack numérique complet : acheté seul ou offert avec les fiches papier. */
  full: boolean;
  /** Fiches achetées à l'unité (si le pack n'est pas complet). */
  fiches: number[];
}

export interface Order {
  session: Stripe.Checkout.Session;
  /** Contenu du panier (ancienne commande : un seul article). */
  lines: CartLine[];
  /** Accès numériques, un par pack. */
  access: PackAccess[];
  /** Fiches papier à expédier. */
  isPrint: boolean;
  /** Résumé lisible : « Les constantes (papier ×2) + … ». */
  title: string;
  /** Adresse de livraison ou point relais (papier uniquement). */
  shipping: ShippingInfo | null;
  /** Paiement confirmé par Stripe. */
  paid: boolean;
  /** Remboursé ou contesté : accès aux fichiers coupé. */
  revoked: boolean;
  /** Fin de validité des liens (secondes Unix). */
  expiresAt: number;
  email: string | null;
}

export async function getOrder(stripe: Stripe, sessionId: string): Promise<Order | null> {
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) return null;
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent.latest_charge"] });
  } catch {
    return null;
  }
  return orderFromSession(session);
}

/** Lignes du panier d'une session (anciennes commandes : un seul article décrit par pack / format / fiches). */
export function sessionLines(session: Stripe.Checkout.Session): CartLine[] {
  const m = session.metadata ?? {};
  const raw = m.panier ? decodeCart(m.panier) : [{ pack: m.pack, format: m.format, qty: 1, fiches: (m.fiches ?? "").split(",").filter(Boolean).map(Number) }];
  return cleanCart(raw, getPack, false);
}

/** Libellé d'une ligne : « Les constantes », « … (papier ×2) », « … : Glycémie, Diurèse ». */
export function lineLabel(line: CartLine): string {
  const pack = getPack(line.pack);
  const name = pack?.name ?? line.pack;
  if (line.format === "papier") return `${name} (papier${line.qty > 1 ? ` ×${line.qty}` : ""})`;
  if (isPhysical(line.format)) return `${name} (${FORMAT_LABEL[line.format].toLowerCase()}${line.qty > 1 ? ` ×${line.qty}` : ""})`;
  if (line.format === "fiches") return `${name} : ${(line.fiches ?? []).map((i) => pack?.items[i]?.title ?? `fiche ${i + 1}`).join(", ")}`;
  return name;
}

/** Accès numériques d'un panier, regroupés par pack. */
export function packAccess(lines: CartLine[]): PackAccess[] {
  const out: PackAccess[] = [];
  for (const line of lines) {
    const pack = getPack(line.pack);
    if (!pack) continue;
    let a = out.find((x) => x.pack.slug === pack.slug);
    if (!a) out.push((a = { pack, full: false, fiches: [] }));
    if (isFullPack(line)) a.full = true;
    else a.fiches = [...new Set([...a.fiches, ...(line.fiches ?? [])])].sort((x, y) => x - y);
  }
  return out;
}

/** Commande à partir d'une session Stripe (avec `payment_intent.latest_charge` développé). */
export function orderFromSession(session: Stripe.Checkout.Session): Order {
  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  const charge = (pi?.latest_charge ?? null) as Stripe.Charge | null;
  const lines = sessionLines(session);
  return {
    session,
    lines,
    access: packAccess(lines),
    isPrint: lines.some((l) => isPhysical(l.format)),
    title: lines.map(lineLabel).join(" + ") || "Commande",
    shipping: shippingInfo(session),
    paid: session.status === "complete" && (session.payment_status === "paid" || session.payment_status === "no_payment_required"),
    revoked: Boolean(charge?.refunded || charge?.disputed),
    expiresAt: session.created + SITE.downloadDays * 24 * 3600,
    email: session.customer_details?.email ?? null,
  };
}

/** Accès au pack d'un lien (jeton) : le pack nommé, ou le premier (anciens liens). */
export const accessFor = (order: Order, slug?: string) => (slug ? order.access.find((a) => a.pack.slug === slug) : order.access[0]) ?? null;

export interface DownloadLink {
  label: string;
  url: string;
}

export async function downloadLinks(env: AppEnv, order: Order, expiresAt: number = order.expiresAt): Promise<DownloadLink[]> {
  if (!order.paid || order.revoked) return [];
  const secret = requireVar(env, "DOWNLOAD_TOKEN_SECRET");
  const several = order.access.length > 1;
  const links: DownloadLink[] = [];
  for (const a of order.access) {
    const p = a.pack.slug;
    if (a.full) {
      for (const [f, file] of a.pack.files.entries()) {
        links.push({ label: file.label, url: `${siteUrl(env)}/telecharger?t=${await signDownloadToken({ s: order.session.id, f, e: expiresAt, p }, secret)}` });
      }
    } else {
      // À l'unité : un PDF par fiche achetée.
      const files = a.pack.unit?.files ?? [];
      for (const f of a.fiches.filter((i) => files[i])) {
        links.push({
          label: several ? `${a.pack.name} · ${files[f].label}` : files[f].label,
          url: `${siteUrl(env)}/telecharger?t=${await signDownloadToken({ s: order.session.id, f, e: expiresAt, t: "fiche", p }, secret)}`,
        });
      }
    }
  }
  return links;
}

/** Livraison de la commande : point relais choisi, ou adresse saisie dans le paiement (null pour un achat numérique). */
export function shippingInfo(session: Stripe.Checkout.Session): ShippingInfo | null {
  const m = session.metadata ?? {};
  const method = getShippingMethod(m.livraison);
  const phone = m.telephone || session.customer_details?.phone || null;
  if (method?.relay && m.relais_id) {
    const relay: RelayPoint = {
      id: m.relais_id,
      name: m.relais_nom ?? "",
      address: m.relais_adresse ?? "",
      postalCode: m.relais_cp ?? "",
      city: m.relais_ville ?? "",
      ...(m.relais_type ? { type: m.relais_type } : {}),
    };
    const name = m.destinataire || session.customer_details?.name || "";
    const kind = relay.type || (method.carrier === "mondial-relay" ? "Point Relais" : "Point retrait");
    return {
      name,
      lines: [name, `${kind} n° ${relay.id}`, relay.name, relay.address, `${relay.postalCode} ${relay.city}`].filter(Boolean),
      deliverable: isDeliverable({ country: "FR", postal_code: relay.postalCode }),
      method,
      carrier: method.carrier,
      relay,
      phone,
      postalCode: relay.postalCode,
    };
  }
  const d = session.collected_information?.shipping_details;
  if (!d?.address) return null;
  const a = d.address;
  const cityLine = [a.postal_code, a.city].filter(Boolean).join(" ");
  return {
    name: d.name ?? "",
    lines: [d.name, a.line1, a.line2, cityLine, a.country === "FR" ? "France" : a.country].filter((l): l is string => Boolean(l)),
    deliverable: isDeliverable(a),
    method,
    carrier: method?.carrier ?? null,
    relay: null,
    phone,
    postalCode: a.postal_code ?? null,
  };
}

/** Images auxquelles un accès donne droit (indices dans pack.imageFiles) : toutes pour un pack complet, sinon les fiches achetées. */
export function allowedImages(a: PackAccess): number[] {
  const all = Array.from({ length: a.pack.imageFiles?.length ?? 0 }, (_, i) => i);
  return a.full ? all : all.filter((i) => a.fiches.includes(i));
}

/** Liens vers la page « Mes fiches en images », un par pack qui a une version images. */
export async function imagesLinks(env: AppEnv, order: Order, expiresAt: number = order.expiresAt): Promise<{ pack: Pack; url: string }[]> {
  if (!order.paid || order.revoked) return [];
  const secret = requireVar(env, "DOWNLOAD_TOKEN_SECRET");
  const out: { pack: Pack; url: string }[] = [];
  for (const a of order.access) {
    if (!a.pack.imageFiles?.length) continue;
    const token = await signDownloadToken({ s: order.session.id, f: 0, e: expiresAt, t: "gal", p: a.pack.slug }, secret);
    out.push({ pack: a.pack, url: `${siteUrl(env)}/mes-fiches?t=${token}` });
  }
  return out;
}

/** Premier lien « Mes fiches en images » (null si aucun pack de la commande n'a de version images). */
export async function imagesLink(env: AppEnv, order: Order, expiresAt: number = order.expiresAt): Promise<string | null> {
  return (await imagesLinks(env, order, expiresAt))[0]?.url ?? null;
}

/** Référence lisible pour le client et le support (fin de l'identifiant Stripe). */
export const orderReference = (sessionId: string) => `LPI-${sessionId.slice(-8).toUpperCase()}`;

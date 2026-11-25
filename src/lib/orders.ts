import "server-only";
import type Stripe from "stripe";
import { getPack, parseFiches, parseFormat, type Pack, type PackFormat } from "@/content/packs";
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

export interface Order {
  session: Stripe.Checkout.Session;
  pack: Pack | undefined;
  /** « papier » : fiches à expédier (PDF offert) ; « pdf » : PDF seul. */
  format: PackFormat;
  /** Adresse de livraison (papier uniquement). */
  shipping: ShippingInfo | null;
  /** Achat à l'unité : indices des fiches achetées (dans pack.items). null = pack complet. */
  fiches: number[] | null;
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

/** Commande à partir d'une session Stripe (avec `payment_intent.latest_charge` développé). */
export function orderFromSession(session: Stripe.Checkout.Session): Order {
  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  const charge = (pi?.latest_charge ?? null) as Stripe.Charge | null;
  const pack = getPack(session.metadata?.pack ?? "");
  const format = parseFormat(session.metadata?.format);
  return {
    session,
    pack,
    fiches: format === "fiches" && pack ? parseFiches(pack, session.metadata?.fiches) : null,
    format,
    shipping: shippingInfo(session),
    paid: session.status === "complete" && (session.payment_status === "paid" || session.payment_status === "no_payment_required"),
    revoked: Boolean(charge?.refunded || charge?.disputed),
    expiresAt: session.created + SITE.downloadDays * 24 * 3600,
    email: session.customer_details?.email ?? null,
  };
}

export interface DownloadLink {
  label: string;
  url: string;
}

export async function downloadLinks(env: AppEnv, order: Order, expiresAt: number = order.expiresAt): Promise<DownloadLink[]> {
  if (!order.pack || !order.paid || order.revoked) return [];
  const secret = requireVar(env, "DOWNLOAD_TOKEN_SECRET");
  // À l'unité : un PDF par fiche achetée.
  if (order.format === "fiches") {
    const files = order.pack.unit?.files ?? [];
    return Promise.all(
      (order.fiches ?? []).filter((i) => files[i]).map(async (i) => ({
        label: files[i].label,
        url: `${siteUrl(env)}/telecharger?t=${await signDownloadToken({ s: order.session.id, f: i, e: expiresAt, t: "fiche" }, secret)}`,
      })),
    );
  }
  return Promise.all(
    order.pack.files.map(async (file, index) => ({
      label: file.label,
      url: `${siteUrl(env)}/telecharger?t=${await signDownloadToken({ s: order.session.id, f: index, e: expiresAt }, secret)}`,
    })),
  );
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

/** Images auxquelles la commande donne droit (indices dans pack.imageFiles) : toutes pour un pack, sinon les fiches achetées. */
export function allowedImages(order: Order): number[] {
  const count = order.pack?.imageFiles?.length ?? 0;
  const all = Array.from({ length: count }, (_, i) => i);
  return order.format === "fiches" ? all.filter((i) => order.fiches?.includes(i)) : all;
}

/** Lien vers la page « Mes fiches en images » (null si le pack n'a pas de version images). */
export async function imagesLink(env: AppEnv, order: Order, expiresAt: number = order.expiresAt): Promise<string | null> {
  if (!order.pack?.imageFiles?.length || !order.paid || order.revoked) return null;
  const token = await signDownloadToken({ s: order.session.id, f: 0, e: expiresAt, t: "gal" }, requireVar(env, "DOWNLOAD_TOKEN_SECRET"));
  return `${siteUrl(env)}/mes-fiches?t=${token}`;
}

/** Référence lisible pour le client et le support (fin de l'identifiant Stripe). */
export const orderReference = (sessionId: string) => `LPI-${sessionId.slice(-8).toUpperCase()}`;

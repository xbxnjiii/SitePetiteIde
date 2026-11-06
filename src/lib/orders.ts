import "server-only";
import type Stripe from "stripe";
import { getPack, type Pack } from "@/content/packs";
import { SITE } from "./format";
import { type AppEnv, requireVar, siteUrl } from "./env";
import { signDownloadToken } from "./download-token";

// Les commandes ne sont stockées QUE chez Stripe : c'est la source de vérité.

export interface Order {
  session: Stripe.Checkout.Session;
  pack: Pack | undefined;
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
  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  const charge = (pi?.latest_charge ?? null) as Stripe.Charge | null;
  return {
    session,
    pack: getPack(session.metadata?.pack ?? ""),
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

export async function downloadLinks(env: AppEnv, order: Order): Promise<DownloadLink[]> {
  if (!order.pack || !order.paid || order.revoked) return [];
  const secret = requireVar(env, "DOWNLOAD_TOKEN_SECRET");
  return Promise.all(
    order.pack.files.map(async (file, index) => ({
      label: file.label,
      url: `${siteUrl(env)}/telecharger?t=${await signDownloadToken({ s: order.session.id, f: index, e: order.expiresAt }, secret)}`,
    })),
  );
}

/** Référence lisible pour le client et le support (fin de l'identifiant Stripe). */
export const orderReference = (sessionId: string) => `LPI-${sessionId.slice(-8).toUpperCase()}`;

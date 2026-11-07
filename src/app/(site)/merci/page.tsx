import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/components/shop/AutoRefresh";
import { Icon } from "@/components/ui/Icon";
import { Mascot, type MascotPose } from "@/components/ui/Mascot";
import { SHIPPING } from "@/content/shipping";
import { getEnvAsync } from "@/lib/env";
import { SITE } from "@/lib/format";
import { downloadLinks, getOrder, imagesLink, orderReference } from "@/lib/orders";
import { stripeClient } from "@/lib/stripe";

export const metadata: Metadata = { title: "Merci pour ta commande", robots: { index: false } };
export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | string[] | undefined>>;

// Page de retour après Stripe. Le paiement est vérifié côté serveur auprès de Stripe :
// la simple redirection ne suffit jamais à donner accès aux fichiers.
export default async function ThanksPage({ searchParams }: { searchParams: Search }) {
  const raw = (await searchParams).session_id;
  const sessionId = typeof raw === "string" ? raw : "";
  const env = await getEnvAsync();
  const order = sessionId ? await getOrder(stripeClient(env), sessionId) : null;

  if (!order || !order.pack) {
    return (
      <Layout pose="question">
        <h1>Commande introuvable</h1>
        <p>Si tu viens de payer, vérifie ta boîte mail : ton lien de téléchargement t&apos;y attend.</p>
        <Link href="/" className="btn btn--primary">Retour à l&apos;accueil</Link>
      </Layout>
    );
  }

  if (!order.paid) {
    return (
      <Layout pose="lecture">
        <h1>Paiement en cours de confirmation…</h1>
        <p>Ça ne prend généralement que quelques secondes. Cette page se met à jour toute seule.</p>
        <AutoRefresh />
      </Layout>
    );
  }

  if (order.revoked) {
    return (
      <Layout pose="question">
        <h1>Commande remboursée</h1>
        <p>Cette commande a été remboursée : l&apos;accès aux fichiers n&apos;est plus disponible.</p>
      </Layout>
    );
  }

  const expired = order.expiresAt < Date.now() / 1000;
  let links: Awaited<ReturnType<typeof downloadLinks>> = [];
  let images: string | null = null;
  try {
    links = expired ? [] : await downloadLinks(env, order);
    images = expired ? null : await imagesLink(env, order);
  } catch (err) {
    console.error("merci: liens indisponibles", err instanceof Error ? err.message : err);
  }

  const isPrint = order.format === "papier";

  return (
    <Layout pose="bravo">
      <h1>Merci pour ta commande ! 💙</h1>
      {isPrint ? (
        <>
          <p>
            Tes fiches papier <strong>{order.pack.name}</strong> sont en préparation. {SHIPPING.dispatch}, et tu recevras le
            numéro de suivi par email{order.email ? <> à <strong>{order.email}</strong></> : null}.
          </p>
          {order.shipping ? (
            <address className="thanks__address">
              {order.shipping.lines.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </address>
          ) : null}
          <p>
            <Icon name="gift" /> En attendant, ton <strong>PDF offert</strong> est déjà prêt :
          </p>
        </>
      ) : (
        <p>
          Ton <strong>{order.pack.name}</strong> est prêt.
          {order.email ? <> Tu vas aussi recevoir ton lien par email à <strong>{order.email}</strong>.</> : null}
        </p>
      )}
      {!expired && links.length === 0 ? (
        <p className="notice">Ton lien de téléchargement t&apos;arrive par email dans quelques instants.</p>
      ) : null}
      {expired ? (
        <p className="notice">
          Ce lien a expiré. <Link href="/retrouver-mon-achat">Reçois de nouveaux liens par email</Link>.
        </p>
      ) : (
        <div className="thanks__links">
          {links.map((l) => (
            <a key={l.url} href={l.url} className="btn btn--primary btn--block">
              <Icon name="download" /> Télécharger · {l.label}
            </a>
          ))}
          {images ? (
            <a href={images} className="btn btn--secondary btn--block">
              📱 Mes fiches en images (pour téléphone)
            </a>
          ) : null}
        </div>
      )}
      <p className="thanks__tip">
        Le téléchargement ne démarre pas ? Si tu es dans TikTok ou Instagram, ouvre cette page dans Safari ou Chrome (menu « … »),
        ou utilise le lien reçu par email.
      </p>
      <p className="thanks__ref">Référence de commande : {orderReference(order.session.id)}</p>
    </Layout>
  );
}

function Layout({ children, pose = "pouce" }: { children: React.ReactNode; pose?: MascotPose }) {
  return (
    <div className="container">
      <div className="thanks">
        <Mascot pose={pose} className="thanks__mascot" />
        {children}
      </div>
    </div>
  );
}

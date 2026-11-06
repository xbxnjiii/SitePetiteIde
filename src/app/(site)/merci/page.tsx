import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/components/shop/AutoRefresh";
import { Icon } from "@/components/ui/Icon";
import { Mascot } from "@/components/ui/Mascot";
import { getEnvAsync } from "@/lib/env";
import { SITE } from "@/lib/format";
import { downloadLinks, getOrder, orderReference } from "@/lib/orders";
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
      <Layout>
        <h1>Commande introuvable</h1>
        <p>Si tu viens de payer, vérifie ta boîte mail : ton lien de téléchargement t&apos;y attend.</p>
        <Link href="/" className="btn btn--primary">Retour à l&apos;accueil</Link>
      </Layout>
    );
  }

  if (!order.paid) {
    return (
      <Layout>
        <h1>Paiement en cours de confirmation…</h1>
        <p>Ça ne prend généralement que quelques secondes. Cette page se met à jour toute seule.</p>
        <AutoRefresh />
      </Layout>
    );
  }

  if (order.revoked) {
    return (
      <Layout>
        <h1>Commande remboursée</h1>
        <p>Cette commande a été remboursée : l&apos;accès aux fichiers n&apos;est plus disponible.</p>
      </Layout>
    );
  }

  const expired = order.expiresAt < Date.now() / 1000;
  const links = expired ? [] : await downloadLinks(env, order);

  return (
    <Layout>
      <h1>Merci pour ta commande ! 💙</h1>
      <p>
        Ton <strong>{order.pack.name}</strong> est prêt.
        {order.email ? <> Tu vas aussi recevoir ton lien par email à <strong>{order.email}</strong>.</> : null}
      </p>
      {expired ? (
        <p className="notice">Ce lien a expiré. Écris-nous à {SITE.contactEmail} avec ta référence de commande : on te le renvoie.</p>
      ) : (
        <div className="thanks__links">
          {links.map((l) => (
            <a key={l.url} href={l.url} className="btn btn--primary btn--block">
              <Icon name="download" /> Télécharger · {l.label}
            </a>
          ))}
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

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container">
      <div className="thanks">
        <Mascot className="thanks__mascot" />
        {children}
      </div>
    </div>
  );
}

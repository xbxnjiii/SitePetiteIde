import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Mascot } from "@/components/ui/Mascot";
import { signDownloadToken, verifyDownloadToken } from "@/lib/download-token";
import { getEnvAsync, requireVar } from "@/lib/env";
import { downloadLinks, getOrder } from "@/lib/orders";
import { stripeClient } from "@/lib/stripe";

export const metadata: Metadata = { title: "Mes fiches en images", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | string[] | undefined>>;

// /mes-fiches?t=<jeton « gal »> — les fiches en images, une par une, pour les enregistrer sur le téléphone.
// Même sécurité que les PDF : jeton signé + paiement revérifié chez Stripe ; chaque image a son propre lien signé.
export default async function MyFichesPage({ searchParams }: { searchParams: Search }) {
  const raw = (await searchParams).t;
  const env = await getEnvAsync();
  const secret = requireVar(env, "DOWNLOAD_TOKEN_SECRET");
  const claims = typeof raw === "string" ? await verifyDownloadToken(raw, secret) : null;
  const order = claims?.t === "gal" ? await getOrder(stripeClient(env), claims.s) : null;

  if (!claims || !order || !order.paid || order.revoked || !order.pack) {
    return (
      <Layout>
        <Mascot pose="question" className="thanks__mascot" />
        <h1>Lien expiré ou invalide</h1>
        <p>Reçois de nouveaux liens par email : ils te donnent accès à tes fiches en PDF et en images.</p>
        <Link href="/retrouver-mon-achat" className="btn btn--primary">
          Recevoir de nouveaux liens
        </Link>
      </Layout>
    );
  }

  // Seules les images réellement présentes dans le bucket sont affichées.
  const files = order.pack.imageFiles ?? [];
  const present = await Promise.all(files.map((f) => env.PDF_BUCKET?.head(f.key).catch(() => null) ?? null));
  const images = await Promise.all(
    files.map(async (file, f) =>
      present[f] ? { label: file.label, url: `/telecharger?t=${await signDownloadToken({ s: claims.s, f, e: claims.e, t: "img" }, secret)}` } : null,
    ),
  );
  const available = images.filter((i): i is { label: string; url: string } => i !== null);
  const pdf = (await downloadLinks(env, order, claims.e))[0];

  return (
    <Layout>
      <h1>{order.pack.name}</h1>
      {available.length ? (
        <>
          <p className="fiches__tip">
            📱 <strong>Sur téléphone :</strong> appuie longuement sur une fiche, puis « Enregistrer dans Photos »
            (ou « Télécharger l&apos;image »).
          </p>
          <ul className="fiches">
            {available.map((img) => (
              <li key={img.url} className="fiches__item">
                <a href={img.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.label} loading="lazy" />
                </a>
                <div className="fiches__bar">
                  <span>{img.label}</span>
                  <a href={`${img.url}&dl=1`} className="link-btn">
                    Télécharger
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="notice">Les fiches en images arrivent très bientôt. En attendant, ton PDF est disponible ci-dessous.</p>
      )}
      {pdf ? (
        <a href={pdf.url} className="btn btn--secondary btn--block fiches__pdf">
          <Icon name="download" /> Télécharger aussi le PDF
        </a>
      ) : null}
    </Layout>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container">
      <div className="thanks fiches-page">{children}</div>
    </div>
  );
}

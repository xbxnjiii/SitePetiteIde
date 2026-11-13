import type { Metadata, Viewport } from "next";
import { Fredoka, Inter, Nunito_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { CF_WEB_ANALYTICS_TOKEN, IS_LIVE, IS_PREPROD, SITE } from "@/lib/format";
import { getEnvAsync } from "@/lib/env";
import { LOCK_COOKIE, isUnlocked } from "@/lib/preprod-lock";
import { PwaSetup } from "@/components/layout/PwaSetup";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/components.css";

// Polices auto-hébergées par Next.js (aucun appel à Google côté visiteur → RGPD).
const fredoka = Fredoka({ subsets: ["latin"], weight: ["600"], variable: "--ff-fredoka", display: "swap" });
const nunito = Nunito_Sans({ subsets: ["latin"], weight: ["700", "800"], variable: "--ff-nunito", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--ff-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: "La Petite IDE — Fiches mémo pour étudiants infirmiers", template: "%s | La Petite IDE" },
  description: SITE.description,
  openGraph: { siteName: SITE.name, locale: "fr_FR", type: "website", images: [{ url: "/img/og.jpg", width: 1200, height: 630 }] },
  robots: IS_LIVE ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#4E7AC7", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Préprod : page de mot de passe tant que le visiteur ne l'a pas saisi (jamais en production).
  const locked = IS_PREPROD && !(await isUnlocked(await getEnvAsync(), (await cookies()).get(LOCK_COOKIE)?.value));
  return (
    <html lang="fr" className={`${fredoka.variable} ${nunito.variable} ${inter.variable}`}>
      <body>
        <a href="#contenu" className="skip-link">Aller au contenu</a>
        {locked ? <PreprodLock /> : children}
        {locked ? null : <PwaSetup />}
        {CF_WEB_ANALYTICS_TOKEN ? (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: CF_WEB_ANALYTICS_TOKEN })}
          />
        ) : null}
      </body>
    </html>
  );
}

function PreprodLock() {
  return (
    <main className="lock">
      <form className="lock__card" method="post" action="/api/verrou">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-rond-256.webp" alt="" width={72} height={72} />
        <h1>Préprod La Petite IDE</h1>
        <p>Espace de test privé.</p>
        <input type="hidden" name="next" value="/" data-next="" />
        <input className="input" type="password" name="password" placeholder="Mot de passe" autoComplete="current-password" required autoFocus />
        <button type="submit" className="btn btn--primary">Entrer</button>
        <script dangerouslySetInnerHTML={{ __html: "var n=document.querySelector('[data-next]');var u=new URL(location.href);u.searchParams.delete('verrou');n.value=u.pathname+u.search;if(location.search.indexOf('verrou=erreur')>-1){document.querySelector('.lock__card p').textContent='Mot de passe incorrect.';}" }} />
      </form>
    </main>
  );
}

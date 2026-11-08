import type { Metadata, Viewport } from "next";
import { Fredoka, Inter, Nunito_Sans } from "next/font/google";
import { InAppBrowserGate } from "@/components/layout/InAppBrowserGate";
import { CF_WEB_ANALYTICS_TOKEN, IS_LIVE, SITE } from "@/lib/format";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fredoka.variable} ${nunito.variable} ${inter.variable}`}>
      <body>
        <a href="#contenu" className="skip-link">Aller au contenu</a>
        {children}
        <InAppBrowserGate />
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

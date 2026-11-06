import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Icon } from "@/components/ui/Icon";
import { Mascot } from "@/components/ui/Mascot";
import { SITE } from "@/lib/format";

export const metadata: Metadata = {
  title: "Contact",
  description: "Une question sur une commande ou un pack ? Contacte La Petite IDE.",
  alternates: { canonical: "/contact" },
};

const CHANNELS = [
  { href: `mailto:${SITE.contactEmail}`, icon: "mail", title: "Par email", text: SITE.contactEmail, className: "social__mail", external: false },
  { href: SITE.social.instagram, icon: "instagram", title: "Sur Instagram", text: "@lapetiteide.fr", className: "social__instagram", external: true },
  { href: SITE.social.tiktok, icon: "tiktok", title: "Sur TikTok", text: "@lapetiteide.fr", className: "social__tiktok", external: true },
] as const;

export default function ContactPage() {
  return (
    <div className="container legal">
      <header className="legal__head contact__head">
        <Breadcrumb items={[{ label: "Contact" }]} />
        <Mascot pose="coucou" className="contact__mascot" />
        <h1>Une question ?</h1>
        <p className="legal__intro">Commande, téléchargement ou simple curiosité : on te répond avec plaisir.</p>
      </header>

      <div className="contact__list">
        {CHANNELS.map((c) => (
          <a
            key={c.title}
            href={c.href}
            className="contact__card"
            {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            <span className={`contact__icon ${c.className}`}>
              <Icon name={c.icon} />
            </span>
            <span className="contact__text">
              <strong>{c.title}</strong>
              <span>{c.text}</span>
            </span>
            <Icon name="arrow" className="contact__arrow" />
          </a>
        ))}
      </div>

      <p className="contact__tip">
        Pour une commande, indique ta référence (dans l&apos;email de confirmation) et l&apos;adresse utilisée lors de l&apos;achat.
        Consulte aussi la <Link href="/faq">FAQ</Link>.
      </p>
    </div>
  );
}

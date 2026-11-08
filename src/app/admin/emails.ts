import type { AppEnv } from "@/lib/env";

// Onglet « Emails » de /admin : historique Resend (programmés, envoyés, annulés…) et annulation des envois programmés.
// Lecture : il faut une clé Resend « Full access » (RESEND_ADMIN_KEY) ; la clé d'envoi du site ne peut pas lire l'historique.

export interface AdminEmail {
  id: string;
  to: string[];
  subject: string;
  created_at: string;
  scheduled_at: string | null;
  last_event: string;
}

const API = "https://api.resend.com";

const key = (env: AppEnv) => env.RESEND_ADMIN_KEY || env.RESEND_API_KEY || "";

export async function listEmails(env: AppEnv, maxPages = 5): Promise<{ emails: AdminEmail[]; error: string | null }> {
  const emails: AdminEmail[] = [];
  let after = "";
  for (let i = 0; i < maxPages; i++) {
    // Limite de Resend : 2 requêtes par seconde.
    if (i > 0) await new Promise((r) => setTimeout(r, 600));
    const res = await fetch(`${API}/emails?limit=100${after ? `&after=${encodeURIComponent(after)}` : ""}`, {
      headers: { Authorization: `Bearer ${key(env)}` },
    }).catch(() => null);
    if (!res?.ok) {
      const detail = res ? await res.text().catch(() => "") : "";
      const restricted = res && ([400, 401, 403].includes(res.status) || /restricted|api key/i.test(detail));
      return {
        emails,
        error: restricted
          ? "La clé Resend du site ne permet pas de lire l'historique (elle sert seulement à envoyer). Pour le voir, ajoute dans Cloudflare un secret RESEND_ADMIN_KEY (clé Resend « Full access »)."
          : `Resend n'a pas répondu (${res?.status ?? "réseau"}). Réessaie dans un instant.`,
      };
    }
    const data = (await res.json()) as { data?: AdminEmail[]; has_more?: boolean };
    const page = data.data ?? [];
    emails.push(...page);
    if (!data.has_more || !page.length) break;
    after = page[page.length - 1].id;
  }
  return { emails, error: null };
}

/** Annule des emails programmés ; renvoie le nombre d'échecs. */
export async function cancelEmails(env: AppEnv, ids: string[]): Promise<number> {
  const results = await Promise.all(
    ids.map((id) =>
      fetch(`${API}/emails/${encodeURIComponent(id)}/cancel`, { method: "POST", headers: { Authorization: `Bearer ${key(env)}` } })
        .then((r) => r.ok)
        .catch(() => false),
    ),
  );
  return results.filter((ok) => !ok).length;
}

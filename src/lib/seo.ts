/** Sérialise des données structurées JSON-LD sans risque d'injection HTML. */
export function jsonLd(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

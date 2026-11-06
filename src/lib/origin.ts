/** Vrai si la requête vient de notre site (avec ou sans « www »), ou d'un serveur local de développement. */
export function isAllowedOrigin(origin: string, base: string): boolean {
  try {
    const o = new URL(origin);
    if (o.hostname === "localhost" || o.hostname === "127.0.0.1") return true;
    const strip = (h: string) => h.replace(/^www\./, "");
    return o.protocol === "https:" && strip(o.hostname) === strip(new URL(base).hostname);
  } catch {
    return false;
  }
}

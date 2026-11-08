import "server-only";

// Jeton signé générique (HMAC-SHA256) : base64url(JSON) + "." + signature.
// Utilisé pour la fiche gratuite et la désinscription (aucune base de données nécessaire).

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function key(secret: string, purpose: string) {
  if (secret.length < 32) throw new Error("secret trop court");
  return crypto.subtle.importKey("raw", enc.encode(`${purpose}:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** Signe `payload` pour un usage précis (`purpose`), avec expiration `exp` (secondes Unix). */
export async function signToken(payload: Record<string, unknown>, exp: number, secret: string, purpose: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify({ ...payload, exp })));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(secret, purpose), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

export async function verifyToken<T extends Record<string, unknown>>(token: string, secret: string, purpose: string): Promise<T | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig || token.length > 2000) return null;
  try {
    if (!(await crypto.subtle.verify("HMAC", await key(secret, purpose), fromB64url(sig), enc.encode(body)))) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(body))) as T & { exp?: number };
    if (typeof data.exp !== "number" || data.exp < Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
}

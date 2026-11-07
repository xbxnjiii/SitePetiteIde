import "server-only";

// Jeton de téléchargement signé (HMAC-SHA256), sans base de données :
//   base64url(JSON {s: id session Stripe, f: index du fichier, e: expiration}) + "." + signature
// Le jeton seul ne suffit pas : à chaque téléchargement, le paiement est revérifié
// auprès de Stripe (remboursement ou litige ⇒ accès coupé).

export interface DownloadClaims {
  s: string; // Checkout Session ID
  f: number; // index du fichier dans le pack
  e: number; // expiration (secondes Unix)
  /** Type de lien : absent = PDF (pack.files) ; « img » = une image (pack.imageFiles) ; « gal » = page /mes-fiches. */
  t?: "img" | "gal";
}

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

async function key(secret: string) {
  if (secret.length < 32) throw new Error("DOWNLOAD_TOKEN_SECRET trop court (32 caractères minimum)");
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signDownloadToken(claims: DownloadClaims, secret: string): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify(claims)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(secret), enc.encode(payload)));
  return `${payload}.${b64url(sig)}`;
}

/** Renvoie les données du jeton s'il est authentique et non expiré, sinon null. */
export async function verifyDownloadToken(token: string, secret: string): Promise<DownloadClaims | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig || token.length > 600) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(secret), fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as DownloadClaims;
    if (typeof claims.s !== "string" || typeof claims.f !== "number" || typeof claims.e !== "number") return null;
    if (claims.t !== undefined && claims.t !== "img" && claims.t !== "gal") return null;
    if (claims.e < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

// Service worker de La Petite IDE : rend le site utilisable hors connexion pour les pages déjà visitées.
//  - pages : réseau d'abord (toujours la dernière version), copie locale en secours ;
//  - fichiers statiques (code, polices, images) : copie locale d'abord (noms uniques à chaque version).
// Jamais mis en cache : paiement, API, admin, téléchargements et pages personnelles.
const VERSION = "lpi-v1";
const PRIVATE = /^\/(api|admin|telecharger|mes-fiches|merci|retrouver-mon-achat|desinscription|fiche-gratuite)(\/|$)/;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || PRIVATE.test(url.pathname)) return;

  const isStatic = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/img/") || /\.(png|webp|jpg|svg|woff2)$/.test(url.pathname);
  if (isStatic) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
            return res.clone();
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(() => caches.match(url.pathname).then((hit) => hit || caches.match("/quiz")).then((hit) => hit || Response.error())),
    );
  }
});

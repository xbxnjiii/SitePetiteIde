// Point d'entrée du Worker Cloudflare : le site Next.js (OpenNext) + le Durable Object du classement des quiz.
// @ts-ignore — fichier généré par `opennextjs-cloudflare build`
import { default as handler } from "./.open-next/worker.js";

export default { fetch: handler.fetch };

// @ts-ignore — objets internes d'OpenNext
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
export { Leaderboard } from "./workers/leaderboard";

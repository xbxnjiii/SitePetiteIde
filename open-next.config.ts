// Configuration de l'adaptateur Cloudflare (OpenNext).
// Phase 2 : pages statiques uniquement, aucun cache incrémental nécessaire.
// Phase 3 : activation du cache R2 (r2IncrementalCache) pour régénérer les pages produits.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});

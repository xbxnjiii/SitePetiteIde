# La Petite IDE — boutique de PDF pour étudiants infirmiers

Boutique en ligne de supports pédagogiques numériques (fiches, mémos, packs).

- **Architecture et choix techniques** : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Pile** : Next.js (App Router, TypeScript) déployé sur **Cloudflare Workers** via OpenNext ·
  Supabase (base de données, à partir de la phase 3) · Cloudflare R2 (fichiers) · Stripe (paiement) · Resend (emails)

## État d'avancement

| Phase | Statut |
|---|---|
| 1. Analyse et architecture | ✅ validée |
| 2. Interface avec données fictives | ✅ livrée — à valider |
| 3. Base de données et administration | ⏳ |
| 4. Paiement et téléchargements | ⏳ |
| 5. Tests et mise en production | ⏳ |

> En phase 2, **toutes les données sont fictives** (`src/lib/mock-data.ts`) et le paiement est
> volontairement désactivé. Un bandeau le signale sur chaque page et l'indexation est bloquée.

## Démarrer en local

Prérequis : Node.js 20+.

```bash
npm install
npm run dev          # http://localhost:3000 (serveur de développement Next.js)
npm run preview      # build Cloudflare + exécution locale dans workerd (http://localhost:8787)
npm run lint         # vérification TypeScript
```

## Déployer sur Cloudflare

Recommandé : **Workers Builds** (déploiement automatique à chaque `git push`) :
Cloudflare → *Workers & Pages* → *Create* → *Import a repository* → ce dépôt, puis :

- Build command : `npx opennextjs-cloudflare build`
- Deploy command : `npx opennextjs-cloudflare deploy`

Le nom du Worker doit être `la-petite-ide` (voir `wrangler.jsonc`).

En ligne de commande : `npx wrangler login` puis `npm run deploy`.

## Organisation du code

```
src/
├── app/            pages (accueil, boutique, catégories, packs, produit, panier, pages légales…)
├── components/
│   ├── layout/     en-tête, menu mobile, pied de page
│   ├── shop/       cartes produit/catégorie, galerie, panier, tri
│   ├── content/    éléments des pages de contenu
│   └── ui/         icônes, logo, mascotte (provisoire), prix, fil d'Ariane
├── lib/
│   ├── catalog.ts  accès au catalogue (données fictives → Supabase en phase 3)
│   ├── mock-data.ts
│   ├── cart-store.ts / use-cart.ts   panier (localStorage, identifiants uniquement)
│   └── types.ts, format.ts, seo.ts
└── styles/         tokens.css (charte), base.css, components.css
```

## Éléments provisoires à remplacer

- **Logo et mascotte** : `src/components/ui/Logo.tsx`, `src/components/ui/Mascot.tsx` (fichiers officiels attendus).
- **Visuels produits et aperçus** : générés en CSS ; remplacés par les images importées dans l'admin en phase 3.
- **Liens TikTok / Instagram, email de contact** : `src/lib/format.ts`.
- **Pages légales** : gabarits avec des mentions `[À compléter : …]` (aucune information légale inventée).

## Sécurité

Aucun secret dans le dépôt. Voir `.env.example` ; en production, les secrets sont stockés via `npx wrangler secret put`.

# La Petite IDE — page de vente de packs de fiches

Page « lien en bio » façon Beacons.ai → page de vente → paiement Stripe → PDF livré par email.

- **Cahier des charges** : [`docs/CAHIER-DES-CHARGES.md`](docs/CAHIER-DES-CHARGES.md)
- **Pile** : Next.js sur **Cloudflare Workers** (OpenNext) · **Stripe Checkout** · **Cloudflare R2** (PDF privés) · **Resend** (emails).
  Aucune base de données : les commandes vivent dans Stripe.

## Parcours et fichiers clés

| Étape | Route | Fichier |
|---|---|---|
| Accueil « lien en bio » | `/` | `src/app/page.tsx` |
| Page de vente | `/<slug-du-pack>` | `src/app/(site)/[slug]/page.tsx` |
| Création du paiement | `POST /api/checkout` | `src/app/api/checkout/route.ts` |
| Retour après paiement | `/merci?session_id=…` | `src/app/(site)/merci/page.tsx` |
| Webhook Stripe → email | `POST /api/webhooks/stripe` | `src/app/api/webhooks/stripe/route.ts` |
| Téléchargement sécurisé | `/telecharger?t=…` | `src/app/telecharger/route.ts` |

**Catalogue** : `src/content/packs.ts`. Après toute modification de nom ou de prix :

```bash
npm run stripe:sync        # crée/met à jour le produit et le prix TTC dans Stripe (idempotent)
```

## Sécurité

- Le paiement n'est jamais déduit de la redirection : `/merci`, le webhook et chaque téléchargement **revérifient la session chez Stripe**.
- Webhook : signature vérifiée (`STRIPE_WEBHOOK_SECRET`), email envoyé une seule fois (marqueur sur le PaymentIntent + clé d'idempotence Resend).
- Liens de téléchargement signés (HMAC-SHA256), valables 30 jours après l'achat, **coupés en cas de remboursement ou de litige**.
- PDF dans un bucket R2 privé : aucune URL publique.
- Aucun secret dans le dépôt (`.dev.vars` est ignoré par Git).

## Développement local

```bash
npm install
cp .env.example .dev.vars          # puis renseigner les valeurs de test
npx wrangler r2 object put la-petite-ide-pdfs/pack-des-constantes/pack-des-constantes.pdf --file ./mon.pdf --local
npm run preview                    # http://localhost:8787 (environnement Cloudflare local)
```

Carte de test Stripe : `4242 4242 4242 4242`, date future, CVC quelconque.

## Mise en production (Cloudflare)

1. **R2** : créer le bucket `la-petite-ide-pdfs` et y déposer `pack-des-constantes/pack-des-constantes.pdf`.
2. **Worker** : *Workers & Pages → Create → Import a repository* → ce dépôt.
   Build : `npx opennextjs-cloudflare build` · Deploy : `npx opennextjs-cloudflare deploy`.
3. **Secrets** (*Settings → Variables and Secrets*) : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `DOWNLOAD_TOKEN_SECRET`.
4. **Stripe** : webhook vers `https://<domaine>/api/webhooks/stripe` (événements `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`) ; URL des CGV dans *Paramètres → Informations publiques*.
5. **Lancement** : `IS_LIVE = true` dans `src/lib/format.ts` (retire le bandeau test, autorise l'indexation).

## Éléments provisoires

Logo et mascotte (`src/components/ui/`), visuels des packs (générés en CSS), liens réseaux sociaux (`src/lib/format.ts`),
mentions `[À compléter : …]` des pages légales.

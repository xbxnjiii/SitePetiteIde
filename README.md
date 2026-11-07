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
| Paiement intégré (Apple Pay, Google Pay, carte) | bloc d'achat de la page de vente | `src/components/shop/PackCheckout.tsx` |
| Création de la session de paiement | `POST /api/checkout` (JSON → intégré, formulaire → page Stripe en secours) | `src/app/api/checkout/route.ts` |
| Consentement CGV + renonciation | `POST /api/checkout/consent` | `src/app/api/checkout/consent/route.ts` |
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
2. **Worker** : *Workers & Pages → Create → Import a repository* → ce dépôt (Worker nommé `sitepetiteide`, comme dans `wrangler.jsonc`).
   Build : `npx opennextjs-cloudflare build` · Deploy : `npx opennextjs-cloudflare deploy`.
3. **Secrets** (*Settings → Variables and Secrets*) : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `DOWNLOAD_TOKEN_SECRET`.
4. **Stripe** : webhook vers `https://<domaine>/api/webhooks/stripe` (événements `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`) ; URL des CGV dans *Paramètres → Informations publiques*.
5. **Apple Pay / Google Pay** : enregistrer `lapetiteide.fr` et `www.lapetiteide.fr` dans Stripe **en mode live**
   (*Paramètres → Moyens de paiement → Domaines*). Déjà fait en mode test.
6. **Clé publique** : remplacer la clé `pk_test_…` par `pk_live_…` dans `src/lib/stripe-public.ts`.
7. **Lancement** : `LAUNCHED = true` dans `src/lib/format.ts` (autorise l'indexation).

## Préprod (preprod.lapetiteide.fr)

Branche Git **`preprod`** → Worker **`preprodlapetiteide`** (Stripe en mode **test**, non indexé, sans statistiques).
La configuration est dans `wrangler.jsonc` → `env.preprod`.

Réglages du Worker (*Settings → Build*) :

| Réglage | Valeur |
|---|---|
| Branche de production | `preprod` |
| Commande de build | `npx opennextjs-cloudflare build --env preprod` |
| Commande de déploiement | `npx opennextjs-cloudflare deploy --env preprod` |
| Variables **de build** | `NEXT_PUBLIC_SITE_ENV=preprod` · `NEXT_PUBLIC_SITE_URL=https://preprod.lapetiteide.fr` · `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…` |

Secrets du Worker (*Settings → Variables and Secrets*) : `STRIPE_SECRET_KEY` (**sk_test_…**), `STRIPE_WEBHOOK_SECRET`
(webhook **de test** vers `https://preprod.lapetiteide.fr/api/webhooks/stripe`), `RESEND_API_KEY`, `DOWNLOAD_TOKEN_SECRET`
(différent de la production), `ADMIN_PASSWORD` (page `/admin`). Produits en mode test : `npm run stripe:sync` avec une clé `sk_test_…`.

## Format papier (fiches imprimées + PDF offert)

- **Catalogue** : champ `print` d'un pack dans `src/content/packs.ts` (prix, caractéristiques, `soldOut: true` pour une rupture).
  Après modification du prix : `npm run stripe:sync` (crée le produit « … — fiches papier », clé de prix `<slug>-papier`).
- **Livraison** : `src/content/shipping.ts` (3,99 €, France métropolitaine, délais). Les adresses d'outre-mer (97…, 98…) sont refusées.
- **Paiement** : adresse de livraison et frais de port demandés dans le paiement Stripe ; métadonnée `format=papier`.
- **Après paiement** : email au client (confirmation + adresse + PDF offert) et alerte « commande à préparer »
  envoyée à `ORDERS_NOTIFY_TO` (par défaut `EMAIL_REPLY_TO`).
- **Expédition** : page **`/admin`** (identifiant au choix, mot de passe = secret `ADMIN_PASSWORD`, 12 caractères minimum) :
  liste des commandes à expédier, adresse à copier, saisie du numéro de suivi ⇒ email « Tes fiches sont en route » au client.

## Éléments provisoires

Logo et mascotte (`src/components/ui/`), visuels des packs (générés en CSS), liens réseaux sociaux (`src/lib/format.ts`),
mentions `[À compléter : …]` des pages légales.

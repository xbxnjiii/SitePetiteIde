# La Petite IDE — Phase 1 : analyse et proposition d'architecture

> Statut : **proposition à valider** (version 3 : Cloudflare + Supabase). Aucun code applicatif n'a été écrit.
> Date : 6 novembre 2026
>
> Historique :
> - v1 : PHP/MySQL.
> - v2 : Vercel + Supabase. L'exigence « PHP / MySQL » du cahier des charges est **abandonnée à la demande du client**.
> - v3 : **Cloudflare (hébergement + fichiers) + Supabase gratuit (base + connexion admin)**, pour réduire les coûts.

---

## 0. État des lieux

| Élément | Constat |
|---|---|
| Dépôt Git `xbxnjiii/SitePetiteIde` | **Vide** : aucun code existant à reprendre ni à préserver. |
| Domaine `lapetiteide.fr` | Acheté chez **LWS** (registrar), qui affiche sa page d'attente. **Aucun hébergement**. Le domaine restera chez LWS ; seule sa gestion DNS sera confiée à Cloudflare (changement des serveurs de noms). |

---

## 1. Architecture technique recommandée

### 1.1 Les briques

| Brique | Choix | Rôle |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Pages du site, back-office et API dans un seul projet. Rendu côté serveur, donc bon référencement et chargement rapide sur mobile. |
| Hébergement | **Cloudflare Workers**, via l'adaptateur officiel `@opennextjs/cloudflare` | Déploiement automatique à chaque `git push`, HTTPS, CDN mondial, protection anti-attaques, usage commercial autorisé. |
| DNS | **Cloudflare** (le domaine reste chez LWS) | CDN, redirection gratuite des emails reçus (`contact@lapetiteide.fr` → vos boîtes Gmail). |
| Base de données | **Supabase PostgreSQL** (offre gratuite au départ), région UE (Paris ou Francfort) | Catalogue, commandes et liens de téléchargement, avec la sécurité par ligne (RLS) activée sur toutes les tables. |
| Authentification | **Supabase Auth** | Connexion au back-office dès la V1. Base prête pour l'espace client en V2 (email + mot de passe ou lien magique). |
| Fichiers | **Cloudflare R2** | Bucket **privé** pour les PDF vendus (aucune URL publique : le Worker lit le fichier et le transmet après vérification), bucket **public** pour les visuels et aperçus. Aucun frais de bande passante. |
| Paiement | **Stripe Checkout** + webhooks | Paiement par carte, Apple Pay et Google Pay, 3-D Secure, codes promo. Stripe Tax en option. |
| Emails transactionnels | **Resend**, avec les modèles d'email écrits en React | Intégration simple avec Next.js, bonne délivrabilité. Alternative européenne : Brevo (via son API). |
| Tâches planifiées | **Cloudflare Cron Triggers** | Activité quotidienne sur la base (évite la mise en pause, voir §1.6), sauvegarde quotidienne vers R2, nettoyage des commandes abandonnées et des liens expirés. |
| Styles | **CSS natif + variables CSS** (fichiers `tokens.css`, `base.css`, `components.css`), polices via `next/font` | Aucune bibliothèque CSS. Les polices sont auto-hébergées, ce qui est bon pour le RGPD et les performances. |

**Dépendances (liste volontairement courte)** : `next`, `react`, `@opennextjs/cloudflare`, `@supabase/supabase-js`,
`@supabase/ssr`, `stripe`, `resend`, `@react-email/components`, `zod` (validation des formulaires).

### 1.2 Coûts

| Service | Offre retenue | Remarque | Coût indicatif* |
|---|---|---|---|
| Cloudflare Workers | Gratuit pour développer, **Workers Paid** probablement nécessaire en production | Un site Next.js dépasse en général les limites de taille et de calcul de l'offre gratuite. À vérifier pendant la phase 2. | 0 à 5 $/mois |
| Cloudflare R2 | Gratuit (10 Go) | Largement suffisant pour des PDF et des images | 0 € |
| Supabase | **Free** | Mise en pause après 7 jours sans activité, contournée par le cron (voir §1.6). Passer en Pro (~25 $/mois) quand le chiffre d'affaires le justifie. | 0 € |
| Resend | Gratuit (3 000 emails/mois, 100/jour) | Suffisant au lancement | 0 € |
| Stripe | Sans abonnement | Commission sur chaque vente (+ Stripe Tax si activé) | % par transaction |

\* Tarifs à vérifier au moment de la souscription.

**Total au lancement : 0 à 5 $/mois.**

### 1.3 Parcours d'achat

```
Mobile (TikTok/Insta) ──► Next.js sur Cloudflare Workers
   │ 1. Panier (localStorage) ou « Acheter maintenant »
   │ 2. Case CGV + renonciation au droit de rétractation (obligatoire)
   │ 3. POST /api/checkout : prix RECALCULÉS côté serveur depuis Supabase,
   │    commande "pending" créée, Checkout Session Stripe
   ▼
Stripe Checkout (CB, Apple Pay, Google Pay, code promo)
   │ 4. Redirection vers /commande/confirmation?session_id=…
   │    → affiche « confirmation en cours » (la redirection NE prouve PAS le paiement)
   ▼
Webhook Stripe ──► /api/webhooks/stripe (signature vérifiée, idempotence)
   │ 5. Fonction SQL fulfill_order() : commande "paid" + liens de téléchargement,
   │    en une seule transaction (packs développés en un lien par PDF)
   │ 6. Email récapitulatif avec les liens (Resend)
   ▼
/api/telecharger/{token} ──► vérifications en SQL ──► le Worker lit le PDF dans R2 (privé) et l'envoie
```

La page de confirmation interroge `/api/commande/statut` toutes les deux secondes, jusqu'à ce que le webhook ait validé la commande.
Les liens s'affichent alors à l'écran.

### 1.4 Événements Stripe traités

| Événement | Action |
|---|---|
| `checkout.session.completed` (payment_status = paid) | `fulfill_order()` puis envoi de l'email |
| `checkout.session.async_payment_succeeded` / `_failed` | Validation ou échec différé |
| `checkout.session.expired` | Commande → `expired` |
| `charge.refunded` | Commande → `refunded` ou `partially_refunded`, **révocation** des liens |
| `charge.dispute.created` | Commande → `disputed`, révocation des liens, journalisation |

### 1.5 Sécurité : qui accède à quoi

- **Visiteur** (clé `anon`, publique) : lecture seule des catégories actives et des produits publiés, via les règles RLS. Rien d'autre n'est accessible.
- **Serveur** (clé `service_role`) : utilisée **uniquement** dans les route handlers et les server actions, jamais envoyée au navigateur.
  Elle sert au checkout, au webhook, aux téléchargements et au back-office.
- **Admin** : connecté via Supabase Auth, puis vérifié dans la table `admins`. Le contrôle est fait par le `middleware`
  **et** de nouveau dans chaque action serveur. Activation de la double authentification (MFA TOTP) recommandée.
- **Secrets** (clés Stripe, Supabase, Resend) : stockés dans les secrets Cloudflare (`wrangler secret`). Seul un `.env.example` sans valeurs est versionné.

### 1.6 Ce que contient la base, et ce que signifie une « mise en pause »

**Une mise en pause ne supprime rien.** Les données sont conservées et le projet se relance en un clic depuis le tableau de bord Supabase.
D'après les sources consultées, un projet resté en pause trop longtemps (environ 90 jours) ne peut plus être relancé directement, mais ses données restent téléchargeables.

**Le vrai risque n'est pas la perte de données, c'est la panne de la boutique.** La base ne contient pas seulement l'historique des ventes :

| Contenu | Exemples | Conséquence si la base est en pause |
|---|---|---|
| **Catalogue** | Produits, prix, descriptions, catégories, packs, chemins des PDF | Pages produits et boutique indisponibles |
| **Commandes** | Référence, montant, statut, produits achetés | Paiement impossible. Si un client paie juste avant la pause, il ne reçoit pas son email (Stripe réessaie l'envoi de la confirmation pendant environ 3 jours). |
| **Liens de téléchargement** | Jetons, expiration, compteur | Les clients ne peuvent plus télécharger |
| **Admin** | Vos 2 comptes, journal des actions | Back-office inaccessible |

**Attention : il y aura bien des données personnelles, même sans compte client.**
- **L'email de l'acheteur** est indispensable pour envoyer les liens et pour « Retrouver mes achats ».
- S'y ajoutent le pays de facturation (TVA), éventuellement le prénom, et les journaux de téléchargement (avec l'IP hachée).
- Le RGPD s'applique donc : politique de confidentialité, durée de conservation, droit d'accès et de suppression.
- Les données bancaires, elles, restent **uniquement chez Stripe**.
- Les factures et les données comptables doivent être conservées **10 ans** (obligation comptable).

**Mesures prévues avec Supabase gratuit :**
1. **Cron quotidien** (Cloudflare Cron Trigger) qui fait une vraie requête sur la base. Le projet n'est donc jamais inactif 7 jours.
   Avec du trafic réel, la boutique génère de toute façon de l'activité.
2. **Sauvegarde quotidienne** de la base (export des tables) vers un bucket R2 privé, conservée 30 jours. On ne dépend pas des sauvegardes Supabase, absentes ou incertaines sur l'offre gratuite.
3. **Les PDF sont dans R2**, pas dans Supabase : même si la base avait un souci, les fichiers sources ne sont jamais concernés.
4. **Alerte par email** si le cron ou la sauvegarde échoue.
5. Passage à **Supabase Pro** dès que les ventes le justifient. Aucun code à modifier.

---

## 2. Organisation des dossiers et fichiers

```
SitePetiteIde/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 ← polices, métadonnées globales
│   │   ├── (boutique)/                ← partie publique (header + footer)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx               ← accueil
│   │   │   ├── boutique/page.tsx      ← grille, recherche, filtres, tris
│   │   │   ├── categorie/[slug]/page.tsx
│   │   │   ├── packs/page.tsx
│   │   │   ├── produit/[slug]/page.tsx
│   │   │   ├── panier/page.tsx
│   │   │   ├── commande/confirmation/page.tsx
│   │   │   ├── retrouver-mes-achats/page.tsx
│   │   │   ├── liens/page.tsx         ← page « lien en bio » façon Beacons (optionnelle)
│   │   │   ├── a-propos/ faq/ contact/
│   │   │   └── (legal)/ mentions-legales/ cgv/ confidentialite/
│   │   ├── admin/
│   │   │   ├── connexion/page.tsx
│   │   │   ├── (protege)/layout.tsx   ← vérification admin
│   │   │   ├── (protege)/page.tsx     ← tableau de bord
│   │   │   ├── (protege)/produits/    (liste, nouveau, [id])
│   │   │   ├── (protege)/categories/
│   │   │   ├── (protege)/commandes/   (liste, [id])
│   │   │   └── (protege)/reglages/
│   │   ├── api/
│   │   │   ├── checkout/route.ts
│   │   │   ├── webhooks/stripe/route.ts
│   │   │   ├── telecharger/[token]/route.ts
│   │   │   ├── commande/statut/route.ts
│   │   │   └── retrouver-mes-achats/route.ts
│   │   ├── sitemap.ts  robots.ts  not-found.tsx
│   ├── components/
│   │   ├── ui/        Button, Card, Badge, Input, Price…
│   │   ├── layout/    Header, Footer, MobileMenu, CartButton
│   │   ├── shop/      ProductCard, CategoryCard, ProductGallery, Filters, CartDrawer
│   │   └── admin/     ProductForm, FileUpload, OrdersTable, StatCard
│   ├── lib/
│   │   ├── supabase/  server.ts, browser.ts, admin.ts (service_role, server-only)
│   │   ├── stripe.ts  resend.ts
│   │   ├── cart.ts  downloads.ts  orders.ts  seo.ts  format.ts
│   │   ├── auth.ts    (requireAdmin)
│   │   └── validation/ (schémas zod)
│   ├── emails/        OrderConfirmation.tsx, ResendLinks.tsx
│   ├── styles/        tokens.css (charte), globals.css
│   ├── middleware.ts  (protection de /admin, rafraîchissement de session)
│   └── cron/          keep-alive.ts, backup.ts, cleanup.ts (Cron Triggers Cloudflare)
├── supabase/
│   ├── migrations/    0001_init.sql, 0002_rls.sql, 0003_functions.sql
│   └── seed.sql       (données fictives pour la phase 2)
├── public/
│   └── img/           logo, mascotte (SVG/WebP), favicon
├── .env.example
├── wrangler.jsonc     (config Cloudflare : buckets R2, crons, variables)
├── open-next.config.ts
├── next.config.ts  tsconfig.json  package.json
└── README.md          (installation, variables d'env, configuration Stripe/Supabase/DNS)
```

Les fiches produit et les pages catégories sont **pré-générées** puis régénérées dès qu'un admin modifie un produit
(`revalidatePath`). Elles sont donc servies instantanément depuis le CDN, ce qui est idéal pour le trafic mobile.

---

## 3. Schéma de la base de données (PostgreSQL / Supabase)

Conventions : identifiants `uuid`, **montants en centimes (`integer`)**, dates `timestamptz`, RLS activée partout.

### 3.1 Vue d'ensemble

```
categories 1──n products ──1──n product_files     (PDF dans le bucket privé)
                 │  │  └──1──n product_previews  (images dans le bucket public)
                 │  └── pack_items (pack_id → products, product_id → products)
customers 1──n orders 1──n order_items n──1 products
                  │            └──1──n download_links n──1 product_files
                  │                         └──1──n download_logs
stripe_events   admins (→ auth.users)   admin_logs   settings
```

### 3.2 Script SQL proposé

```sql
-- ===== Types =============================================================
create type product_type   as enum ('single', 'pack');
create type product_status as enum ('draft', 'published', 'archived');
create type order_status   as enum ('pending','paid','failed','canceled','expired',
                                    'refunded','partially_refunded','disputed');

-- ===== Catalogue =========================================================
create table categories (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  description      text,
  image_path       text,
  position         smallint not null default 0,
  is_active        boolean not null default true,
  meta_title       text,
  meta_description text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table products (
  id                     uuid primary key default gen_random_uuid(),
  type                   product_type not null default 'single',
  category_id            uuid references categories(id) on delete set null,
  name                   text not null,
  slug                   text not null unique,
  short_description      text not null,
  description            text,
  learning_objectives    text,        -- objectifs pédagogiques
  contents               text,        -- contenu du fichier
  page_count             smallint,
  price_cents            integer not null check (price_cents >= 0),
  compare_at_price_cents integer check (compare_at_price_cents >= 0),  -- prix barré
  cover_image_path       text,
  is_featured            boolean not null default false,   -- « produits populaires »
  status                 product_status not null default 'draft',
  published_at           timestamptz,
  meta_title             text,
  meta_description       text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index on products (status, published_at desc);
create index on products (category_id);

-- PDF vendus (plusieurs lignes = historique des versions)
create table product_files (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete restrict,
  storage_path  text not null unique,      -- clé de l'objet dans le bucket R2 privé
  download_name text not null,             -- « LaPetiteIDE-Memo-Constantes.pdf »
  size_bytes    integer not null,
  is_current    boolean not null default true,
  created_at    timestamptz not null default now()
);

create table product_previews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  image_path  text not null,
  alt_text    text not null,
  position    smallint not null default 0
);

create table pack_items (
  pack_id     uuid not null references products(id) on delete cascade,
  product_id  uuid not null references products(id) on delete restrict,
  position    smallint not null default 0,
  primary key (pack_id, product_id),
  check (pack_id <> product_id)
);

-- ===== Clients & commandes ==============================================
-- user_id restera vide en V1 ; il sera relié à auth.users avec l'espace client V2.
create table customers (
  id                 uuid primary key default gen_random_uuid(),
  email              citext not null unique,      -- extension citext
  first_name         text,
  user_id            uuid unique references auth.users(id) on delete set null,
  stripe_customer_id text,
  created_at         timestamptz not null default now()
);

create table orders (
  id                         uuid primary key default gen_random_uuid(),
  reference                  text not null unique,  -- ex. LPI-26-000123
  customer_id                uuid references customers(id) on delete set null,
  email                      citext,
  status                     order_status not null default 'pending',
  currency                   char(3) not null default 'EUR',
  subtotal_cents             integer not null,
  discount_cents             integer not null default 0,
  tax_cents                  integer not null default 0,
  total_cents                integer not null,
  promo_code                 text,
  billing_country            char(2),               -- TVA / OSS
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id   text,
  terms_accepted_at          timestamptz,           -- acceptation des CGV
  withdrawal_waiver_at       timestamptz,           -- renonciation au droit de rétractation
  paid_at                    timestamptz,
  refunded_at                timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);
create index on orders (status, created_at desc);

-- Photographie du produit au moment de l'achat
create table order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders(id) on delete cascade,
  product_id       uuid references products(id) on delete set null,
  product_name     text not null,
  product_type     product_type not null,
  unit_price_cents integer not null,
  quantity         smallint not null default 1
);

-- ===== Téléchargements sécurisés ========================================
create table download_links (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references orders(id) on delete cascade,
  order_item_id      uuid not null references order_items(id) on delete cascade,
  product_file_id    uuid not null references product_files(id) on delete restrict,
  token_hash         text not null unique,   -- SHA-256 du jeton (le jeton en clair n'est jamais stocké)
  expires_at         timestamptz not null,
  max_downloads      smallint not null,
  download_count     smallint not null default 0,
  last_downloaded_at timestamptz,
  revoked_at         timestamptz,
  created_at         timestamptz not null default now()
);

create table download_logs (
  id               bigint generated always as identity primary key,
  download_link_id uuid not null references download_links(id) on delete cascade,
  ip_hash          text,          -- IP hachée (RGPD), purgée après 12 mois
  user_agent       text,
  created_at       timestamptz not null default now()
);

-- ===== Paiement : idempotence ===========================================
create table stripe_events (
  id           text primary key,     -- evt_…
  type         text not null,
  processed_at timestamptz not null default now()
);

-- ===== Administration ===================================================
create table admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create table admin_logs (
  id          bigint generated always as identity primary key,
  admin_id    uuid references admins(user_id) on delete set null,
  action      text not null,          -- product.update, category.delete…
  entity_type text,
  entity_id   uuid,
  details     jsonb,
  created_at  timestamptz not null default now()
);

create table settings (
  key   text primary key,
  value jsonb not null
);
-- ex. download_link_days=30, download_max_count=5, instagram_url, tiktok_url, contact_email

-- ===== Sécurité par ligne (extrait) =====================================
alter table categories enable row level security;
alter table products   enable row level security;
-- … idem pour TOUTES les tables

create policy "public: catégories actives" on categories
  for select using (is_active);
create policy "public: produits publiés" on products
  for select using (status = 'published');
-- Aucune politique publique sur orders, customers, download_links, product_files…
-- → inaccessibles avec la clé anon, uniquement côté serveur (service_role).
```

### 3.3 Fonctions SQL prévues

Le client JavaScript de Supabase ne gère pas les transactions. Les opérations critiques sont donc écrites en **fonctions PostgreSQL** (`rpc`),
ce qui les rend atomiques :

| Fonction | Rôle |
|---|---|
| `fulfill_order(session_id, …)` | Passe la commande en `paid`, crée ou relie le client, développe les packs et crée un lien par PDF. Ne fait rien si la commande est déjà payée. |
| `consume_download(token_hash)` | Vérifie en une seule requête que la commande est payée, que le lien n'est ni révoqué ni expiré et que le quota n'est pas atteint, puis incrémente le compteur et renvoie le chemin du fichier. |
| `revoke_order_links(order_id)` | Révoque tous les liens d'une commande (remboursement ou litige). |
| `next_order_reference()` | Génère une référence lisible et séquentielle (`LPI-26-000123`). |
| `is_admin()` | Utilisée par les règles RLS et le back-office. |

### 3.4 Choix de conception

- **Packs = produits** (`type = 'pack'`) avec leur page, leur prix et leur image. À l'achat, un pack donne un lien par PDF contenu.
- **Panier dans le `localStorage`** : seuls les identifiants des produits sont envoyés au serveur, qui **recalcule toujours les prix**.
- **Codes promo** gérés dans Stripe (Promotion Codes). Le code utilisé et la remise sont enregistrés sur la commande.
- **Best-sellers** calculés à partir des `order_items` des commandes payées.
- **Archiver plutôt que supprimer** un produit déjà vendu, pour que les liens des anciens clients restent valides.
- **Téléchargement** : le lien envoyé au client est **notre** URL `/api/telecharger/{token}`. Après vérification, le Worker lit le PDF
  directement dans le bucket R2 privé et l'envoie au client. Le fichier n'a **aucune** URL publique, même temporaire.

---

## 4. Fonctionnalités à développer en priorité

| Phase | Contenu | Livrable à valider |
|---|---|---|
| **2. Interface** (données fictives) | Initialisation de Next.js pour Cloudflare, design system (couleurs, polices, boutons, cartes), header avec panier, footer, accueil (hero + mascotte, populaires, catégories, avantages, packs), boutique (recherche, filtres, tris), catégorie, fiche produit, panier, gabarits légaux. Déploiement d'aperçu sur Cloudflare (`*.workers.dev`). | URL d'aperçu, testable sur téléphone |
| **3. Supabase + admin** | Projet Supabase (UE), migrations, RLS, buckets R2, connexion admin, gestion des catégories, produits (images, PDF, aperçus) et packs, statuts, commandes, tableau de bord, réglages | Boutique administrable : les données fictives sont remplacées par la base |
| **4. Paiement + téléchargements** | Stripe Checkout (mode test), webhook signé et idempotent, `fulfill_order`, liens sécurisés, email Resend, « Retrouver mes achats », remboursements et échecs | Achat de bout en bout en mode test |
| **5. Tests + mise en production** | Tests mobiles (Safari iOS, Chrome Android, navigateurs intégrés TikTok/Instagram), paiements, emails, sécurité (RLS, en-têtes), performances, SEO (sitemap, JSON-LD), DNS LWS → Cloudflare, vérification du cron et des sauvegardes, Stripe en mode live | V1 commerciale en ligne |

**Le chemin critique pour vendre** : fiche produit → Stripe → webhook → email avec lien → téléchargement.

---

## 5. Difficultés et points de vigilance

### 5.1 Juridique et fiscal (à régler avant la phase 4)

1. **Droit de rétractation (art. L221-28 13° du Code de la consommation)** : pour livrer un PDF immédiatement, le client doit donner son accord exprès
   et renoncer explicitement à son droit de rétractation. Prévoir une case obligatoire, non pré-cochée, un horodatage en base et un rappel dans l'email.
2. **TVA** : tout dépend du statut juridique.
   - En franchise en base, la mention « TVA non applicable, art. 293 B du CGI » est obligatoire.
   - Les ventes à des particuliers d'autres pays de l'UE restent soumises à la TVA française jusqu'à 10 000 € par an. Au-delà, il faut appliquer la TVA du pays du client (guichet unique OSS).
   - Stripe Tax peut être activé plus tard sans modifier le code.
   - → **À confirmer avec un expert-comptable.**
3. **RGPD** :
   - Il y aura bien des données personnelles (email des acheteurs), même sans compte client : voir §1.6.
   - Cloudflare, Supabase et Resend sont des sociétés américaines. Elles proposent des accords de traitement des données (DPA) et adhèrent au Data Privacy Framework.
   - Choisir les régions UE, et mentionner ces sous-traitants dans la politique de confidentialité.
4. **Pages légales** : je fournirai des gabarits, mais vos informations réelles sont nécessaires (SIRET, adresse, statut). Je n'inventerai aucune donnée.
5. **Contenu à caractère médical** : prévoir une mention indiquant que les supports sont pédagogiques et ne remplacent pas les protocoles de service.

### 5.2 Technique

6. **Pause de Supabase gratuit** : voir le §1.6 (cron d'activité, sauvegarde maison, alertes). Next.js sur Cloudflare passe par l'adaptateur OpenNext :
   il faut vérifier dès la phase 2 que la taille du site et le temps de calcul tiennent dans l'offre choisie, et utiliser des bibliothèques compatibles avec Workers.
7. **Navigateurs intégrés TikTok/Instagram** : le panier est perdu quand on bascule vers Safari, Apple Pay fonctionne mal, et le téléchargement échoue souvent sur iOS.
   → Bouton « Acheter maintenant » direct, email systématique avec les liens, message « Ouvrir dans le navigateur » et liens réutilisables.
8. **Webhook** :
   - lire le corps brut de la requête (`req.text()`) pour vérifier la signature ;
   - utiliser `constructEventAsync` (version asynchrone compatible avec Workers) ;
   - gérer les doublons et les événements reçus dans le désordre (`stripe_events` + `fulfill_order` idempotente) ;
   - ne jamais valider une commande depuis la page de succès.
9. **Clé `service_role`** : elle contourne toute la sécurité RLS. Elle est limitée aux modules marqués `server-only` et ne doit jamais être préfixée `NEXT_PUBLIC_`.
10. **Taille des PDF importés** : pour ne pas dépendre des limites de requête, l'admin enverra les PDF **directement vers R2**,
    via une URL d'envoi signée et temporaire.
11. **Délivrabilité des emails** : ajouter les enregistrements DNS SPF, DKIM et DMARC de Resend dans la zone DNS Cloudflare.
12. **Partage des PDF** : on peut le limiter (durée, quota, révocation), pas l'empêcher. Un filigrane avec l'email de l'acheteur pourrait venir en V1.1.
13. **Traceurs marketing** : les pixels TikTok/Meta imposent un bandeau de consentement. En V1, on peut suivre les ventes sans traceur
    (tableau de bord admin, Stripe, paramètres UTM sur les liens en bio, ou Cloudflare Web Analytics, qui fonctionne sans cookie).
14. **Sauvegardes** : export quotidien de la base vers R2 (voir §1.6). Les PDF sont dans R2, et vous gardez aussi vos originaux.

---

## 6. Questions à valider avant la phase 2

1. **Architecture** : ✅ validée par le client — Next.js sur Cloudflare Workers + R2, Supabase gratuit, Stripe Checkout, Resend.
2. **DNS** : êtes-vous d'accord pour confier la gestion DNS de `lapetiteide.fr` à Cloudflare (le domaine reste chez LWS) ?
3. **Comptes** : je vous guiderai pour créer les comptes Cloudflare, Supabase, Stripe et Resend. Avez-vous déjà l'un d'eux ?
4. **Statut juridique et régime de TVA** de La Petite IDE ?
5. **Éléments graphiques** : logo et mascotte en haute définition (SVG ou PNG transparent), visuels produits ?
6. **Catalogue** : nombre de produits au lancement et fourchettes de prix ?
7. **Téléchargements** : liens valables 30 jours et 5 téléchargements par fichier, plus un renvoi par email via « Retrouver mes achats ». Cela vous convient-il ?
8. **Page `/liens`** façon Beacons pour la bio TikTok et Instagram : à inclure dans la V1 ?

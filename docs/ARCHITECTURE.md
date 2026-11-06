# La Petite IDE — Phase 1 : analyse et proposition d'architecture

> Statut : **proposition à valider**. Aucun code applicatif n'a été écrit.
> Date : 6 novembre 2026

---

## 0. État des lieux

| Élément | Constat |
|---|---|
| Dépôt Git `xbxnjiii/SitePetiteIde` | **Vide** (aucun commit, aucune branche distante). Aucun code existant à reprendre ni à préserver. |
| Domaine `lapetiteide.fr` | Enregistré chez **LWS** (hébergeur français). Le domaine affiche la page de parking LWS par défaut : aucun site en ligne. |
| Conséquence | On part de zéro, et le domaine est déjà chez un hébergeur mutualisé PHP/MySQL. C'est cohérent avec le cahier des charges (PHP + MySQL, hébergement web classique). |

---

## 1. Architecture technique recommandée

### 1.1 Décision : PHP 8.2+ / MySQL sur LWS, sans framework

| Brique | Choix | Pourquoi |
|---|---|---|
| Hébergement | **LWS mutualisé** (offre avec PHP 8.2+, MySQL/MariaDB, SSH, cron, HTTPS Let's Encrypt) | Le domaine y est déjà. Coût faible, tout au même endroit, conforme au cahier des charges. |
| Backend | **PHP 8.2+ natif**, petite architecture MVC maison (routeur, contrôleurs, vues PHP) | Pas de framework (demande explicite), mais une structure propre et évolutive. |
| Base de données | **MySQL / MariaDB** via **PDO** (requêtes préparées uniquement) | Imposé par le cahier des charges, inclus chez LWS. |
| Front | **HTML5 + CSS3 (variables CSS) + JavaScript vanilla** | Rapide sur mobile, aucune étape de build. |
| Paiement | **Stripe Checkout** (page de paiement hébergée par Stripe) + **webhooks** | Gère la 3-D Secure (SCA), Apple Pay et Google Pay (essentiel pour le trafic mobile TikTok/Instagram), les codes promo et le calcul de TVA via Stripe Tax. Aucune donnée bancaire ne passe par notre serveur. |
| Emails transactionnels | **Brevo** (ex-Sendinblue, société française) en **SMTP**, envoyés avec **PHPMailer** | Bonne délivrabilité vers Gmail/Outlook, offre gratuite (300 emails/jour), conforme RGPD. Le SMTP de LWS peut servir de solution de secours. |
| Dépendances (Composer) | `stripe/stripe-php`, `phpmailer/phpmailer` — **et c'est tout** | Deux bibliothèques officielles et maintenues. Pas de dotenv : un petit lecteur de `.env` maison suffit. |
| Consentement cookies | Pas de bandeau si aucun traceur publicitaire. Si les pixels TikTok/Meta sont ajoutés : **tarteaucitron.js** (solution française, légère) | Les cookies Stripe et de session sont strictement nécessaires : ils ne demandent pas de consentement. |

### 1.2 Pourquoi pas Vercel + Supabase ?

C'est une bonne pile, mais elle **ne correspond pas** à ce projet :

- **Supabase** repose sur **PostgreSQL**, pas MySQL. Il faudrait aussi utiliser son SDK JavaScript, ce qui contredit le choix PHP/MySQL.
- **Vercel** est conçu pour Node.js/Next.js. PHP n'y fonctionne qu'avec un runtime communautaire. Les fonctions serverless n'ont pas de disque persistant : il faudrait un stockage objet en plus pour les PDF, plus des crons externes.
- Le résultat serait **3 ou 4 services à configurer et à payer**, au lieu d'un seul hébergement déjà réservé.

On pourra reconsidérer la question si le projet devient une vraie plateforme (quiz, abonnements, application). Pour la V1, la priorité est de vendre vite et simplement.

### 1.3 Schéma des flux (achat d'un PDF)

```
Mobile (TikTok/Insta) ──► lapetiteide.fr (PHP)
                            │ 1. Panier en session + case « renonciation rétractation »
                            │ 2. Création commande "pending" + Checkout Session Stripe
                            ▼
                         Stripe Checkout (CB, Apple Pay, Google Pay, code promo, TVA)
                            │ 3. Redirection /commande/confirmation?session_id=…
                            │    (n'atteste PAS du paiement : affiche « confirmation en cours »)
                            ▼
              Webhook Stripe ──► /webhooks/stripe (vérification de signature)
                            │ 4. checkout.session.completed → commande "paid"
                            │ 5. Génération des liens de téléchargement (packs développés)
                            │ 6. Email récapitulatif + liens (Brevo SMTP)
                            ▼
                         /telecharger/{token} ──► vérifs ──► PDF stocké hors web
```

La page de confirmation interroge le serveur toutes les quelques secondes (petit `fetch` JS) jusqu'à ce que le webhook ait validé la commande. Les liens s'affichent alors à l'écran.

### 1.4 Événements Stripe traités

| Événement | Action |
|---|---|
| `checkout.session.completed` (payment_status = paid) | Commande → `paid`, création des droits de téléchargement, envoi de l'email |
| `checkout.session.async_payment_succeeded` / `_failed` | Rares avec la CB, mais gérés pour d'autres moyens de paiement |
| `checkout.session.expired` | Commande → `expired` (panier abandonné) |
| `charge.refunded` | Commande → `refunded` ou `partially_refunded`, **révocation** des liens |
| `charge.dispute.created` | Journalisation + révocation des liens + alerte admin |

Chaque événement est enregistré dans `stripe_events` (identifiant unique) pour garantir l'**idempotence** : Stripe peut renvoyer un même événement plusieurs fois.

---

## 2. Organisation des dossiers et fichiers

Principe : **seul `public/` est exposé sur le web**. Le code, la configuration, les PDF et les logs restent en dehors.

```
SitePetiteIde/
├── public/                       ← racine web (DocumentRoot du domaine)
│   ├── index.php                 ← point d'entrée unique (front controller)
│   ├── .htaccess                 ← réécriture d'URL, en-têtes de sécurité, cache
│   ├── robots.txt
│   ├── assets/
│   │   ├── css/  (base.css, components.css, pages.css, admin.css)
│   │   ├── js/   (app.js, cart.js, shop-filters.js, admin.js)
│   │   ├── img/  (logo, mascotte en SVG/WebP, icônes)
│   │   └── fonts/ (Fredoka, Nunito Sans, Inter auto-hébergées → RGPD + performance)
│   └── uploads/
│       ├── products/             ← visuels produits (publics)
│       └── previews/             ← aperçus de pages (images publiques, jamais le PDF)
│
├── app/
│   ├── Core/        Router, Database (PDO), View, Request, Session, Csrf, Config, Logger
│   ├── Controllers/
│   │   ├── HomeController, ShopController, CategoryController, ProductController
│   │   ├── CartController, CheckoutController, OrderController, DownloadController
│   │   ├── WebhookController, PageController (légal, FAQ, contact), SitemapController
│   │   └── Admin/  AuthController, DashboardController, ProductController,
│   │               CategoryController, OrderController, SettingsController
│   ├── Models/      (accès aux données, une classe par table principale)
│   │   Product, Category, Pack, Order, OrderItem, Customer, DownloadLink, AdminUser
│   ├── Services/
│   │   StripeService, FulfillmentService (droits et liens), DownloadService,
│   │   MailService, CartService, UploadService (validation PDF/images),
│   │   SeoService (meta, JSON-LD), AdminAuth
│   └── helpers.php  (e() pour l'échappement, url(), price(), asset()…)
│
├── views/
│   ├── layouts/     main.php, admin.php, email.php
│   ├── partials/    header.php, footer.php, product-card.php, category-card.php, cart-drawer.php
│   ├── pages/       home, shop, category, product, cart, confirmation, retrouver-achats,
│   │                legal/ (mentions, cgv, confidentialite), faq, contact, about, 404
│   ├── admin/       dashboard, products/ (list, form), categories/, orders/ (list, show), login
│   └── emails/      order-confirmation.php (HTML + texte), resend-links.php
│
├── config/
│   ├── app.php      (lit le .env, valeurs par défaut)
│   └── routes.php   (table des routes)
│
├── database/
│   ├── migrations/  001_init.sql, 002_…sql
│   └── seeds/       demo_data.sql (données fictives pour la phase 2)
│
├── storage/                      ← JAMAIS accessible par le web
│   ├── pdfs/                     ← fichiers vendus (noms aléatoires)
│   ├── logs/                     ← app.log, payments.log, security.log
│   └── backups/
│
├── cron/
│   ├── cleanup.php   (commandes pending expirées, liens expirés, purge des logs > 12 mois)
│   └── backup.php    (dump SQL et archive des PDF, rotation)
│
├── bin/
│   └── create-admin.php          (création du 1er compte admin en ligne de commande)
│
├── tests/                         (scripts de test : webhook simulé, téléchargement…)
├── vendor/                        (Composer, non versionné)
├── .env.example                   (modèle sans secrets ; le vrai .env n'est jamais commité)
├── .gitignore
├── composer.json
└── README.md                      (installation, déploiement LWS, configuration Stripe)
```

### Plan des URL (propres, pour le SEO)

| URL | Page |
|---|---|
| `/` | Accueil |
| `/boutique` (`?q=…&categorie=…&tri=prix-asc\|prix-desc\|nouveautes`) | Boutique |
| `/categorie/{slug}` (ex. `/categorie/fiches-de-revision`) | Catégorie |
| `/packs` | Packs et collections |
| `/produit/{slug}` | Fiche produit |
| `/panier` | Panier |
| `/commande/paiement` (POST) | Création de la Checkout Session et redirection vers Stripe |
| `/commande/confirmation` | Confirmation et téléchargements |
| `/retrouver-mes-achats` | Renvoi des liens par email (remplace l'espace client en V1) |
| `/telecharger/{token}` | Téléchargement sécurisé |
| `/webhooks/stripe` | Webhook (POST, signature obligatoire) |
| `/a-propos`, `/faq`, `/contact`, `/mentions-legales`, `/cgv`, `/confidentialite` | Pages de contenu |
| `/sitemap.xml` | Sitemap généré dynamiquement |
| `/admin/…` | Back-office |

---

## 3. Schéma de la base de données MySQL

Conventions : InnoDB, `utf8mb4_unicode_ci`, **montants en centimes (INT)** pour éviter les erreurs d'arrondi, dates en UTC.

### 3.1 Vue d'ensemble

```
categories 1──n products ──1──n product_files
                 │  │  └──1──n product_previews
                 │  └── pack_items (pack_id → products, product_id → products)
                 │
customers 1──n orders 1──n order_items n──1 products
                  │            └──1──n download_links n──1 product_files
                  │                         └──1──n download_logs
stripe_events (idempotence)   admin_users 1──n admin_logs   settings (clé/valeur)
```

### 3.2 Script SQL proposé

```sql
-- ===== Catalogue ==========================================================
CREATE TABLE categories (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  slug          VARCHAR(140) NOT NULL UNIQUE,
  description   TEXT NULL,
  image_path    VARCHAR(255) NULL,
  position      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  meta_title    VARCHAR(160) NULL,
  meta_description VARCHAR(255) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type               ENUM('single','pack') NOT NULL DEFAULT 'single',
  category_id        INT UNSIGNED NULL,
  name               VARCHAR(160) NOT NULL,
  slug               VARCHAR(180) NOT NULL UNIQUE,
  short_description  VARCHAR(255) NOT NULL,
  description        TEXT NULL,
  learning_objectives TEXT NULL,     -- objectifs pédagogiques
  contents           TEXT NULL,      -- contenu du fichier
  page_count         SMALLINT UNSIGNED NULL,
  price_cents        INT UNSIGNED NOT NULL,
  compare_at_price_cents INT UNSIGNED NULL,   -- prix barré (packs)
  cover_image_path   VARCHAR(255) NULL,
  is_featured        TINYINT(1) NOT NULL DEFAULT 0,  -- « produits populaires »
  status             ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  published_at       DATETIME NULL,
  meta_title         VARCHAR(160) NULL,
  meta_description   VARCHAR(255) NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_products_status (status, published_at),
  FULLTEXT INDEX ft_products_search (name, short_description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Le PDF vendu. Plusieurs lignes possibles = historique des versions.
CREATE TABLE product_files (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id     INT UNSIGNED NOT NULL,
  storage_name   CHAR(64) NOT NULL UNIQUE,   -- nom aléatoire dans storage/pdfs/
  download_name  VARCHAR(190) NOT NULL,      -- ex. « LaPetiteIDE-Memo-Constantes.pdf »
  size_bytes     INT UNSIGNED NOT NULL,
  sha256         CHAR(64) NOT NULL,
  is_current     TINYINT(1) NOT NULL DEFAULT 1,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_files_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Aperçus visuels (images de quelques pages, publiques)
CREATE TABLE product_previews (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id  INT UNSIGNED NOT NULL,
  image_path  VARCHAR(255) NOT NULL,
  alt_text    VARCHAR(190) NOT NULL,
  position    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_previews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Composition des packs (un pack est un produit de type 'pack')
CREATE TABLE pack_items (
  pack_id     INT UNSIGNED NOT NULL,
  product_id  INT UNSIGNED NOT NULL,
  position    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (pack_id, product_id),
  CONSTRAINT fk_pack_pack    FOREIGN KEY (pack_id)    REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_pack_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Clients & commandes ===============================================
-- Prêt pour l'espace client V2 : il suffira d'ajouter password_hash / email_verified_at.
CREATE TABLE customers (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(190) NOT NULL UNIQUE,
  first_name  VARCHAR(100) NULL,
  stripe_customer_id VARCHAR(64) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference           VARCHAR(20) NOT NULL UNIQUE,     -- ex. LPI-26-000123
  customer_id         INT UNSIGNED NULL,               -- renseigné au paiement
  email               VARCHAR(190) NULL,               -- email saisi chez Stripe
  status              ENUM('pending','paid','failed','canceled','expired',
                           'refunded','partially_refunded','disputed')
                      NOT NULL DEFAULT 'pending',
  currency            CHAR(3) NOT NULL DEFAULT 'EUR',
  subtotal_cents      INT UNSIGNED NOT NULL,
  discount_cents      INT UNSIGNED NOT NULL DEFAULT 0,
  tax_cents           INT UNSIGNED NOT NULL DEFAULT 0,
  total_cents         INT UNSIGNED NOT NULL,
  promo_code          VARCHAR(50) NULL,
  billing_country     CHAR(2) NULL,                    -- utile pour la TVA / OSS
  stripe_checkout_session_id VARCHAR(255) NULL UNIQUE,
  stripe_payment_intent_id   VARCHAR(255) NULL,
  terms_accepted_at   DATETIME NULL,                   -- acceptation des CGV
  withdrawal_waiver_at DATETIME NULL,                  -- renonciation au droit de rétractation
  paid_at             DATETIME NULL,
  refunded_at         DATETIME NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_orders_status_date (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Photographie du produit au moment de l'achat (le nom ou le prix peuvent changer ensuite)
CREATE TABLE order_items (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id          INT UNSIGNED NOT NULL,
  product_id        INT UNSIGNED NULL,
  product_name      VARCHAR(160) NOT NULL,
  product_type      ENUM('single','pack') NOT NULL,
  unit_price_cents  INT UNSIGNED NOT NULL,
  quantity          SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  CONSTRAINT fk_items_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Téléchargements sécurisés =========================================
-- Un lien par fichier acheté (un pack de 6 mémos = 6 liens).
CREATE TABLE download_links (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id         INT UNSIGNED NOT NULL,
  order_item_id    INT UNSIGNED NOT NULL,
  product_file_id  INT UNSIGNED NOT NULL,
  token_hash       CHAR(64) NOT NULL UNIQUE,  -- SHA-256 du jeton ; le jeton en clair n'est jamais stocké
  expires_at       DATETIME NOT NULL,
  max_downloads    SMALLINT UNSIGNED NOT NULL,
  download_count   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  last_downloaded_at DATETIME NULL,
  revoked_at       DATETIME NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dl_order FOREIGN KEY (order_id)        REFERENCES orders(id)        ON DELETE CASCADE,
  CONSTRAINT fk_dl_item  FOREIGN KEY (order_item_id)   REFERENCES order_items(id)   ON DELETE CASCADE,
  CONSTRAINT fk_dl_file  FOREIGN KEY (product_file_id) REFERENCES product_files(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE download_logs (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  download_link_id  INT UNSIGNED NOT NULL,
  ip_hash           CHAR(64) NULL,            -- IP hachée (RGPD), purgée après 12 mois
  user_agent        VARCHAR(255) NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dlog_link FOREIGN KEY (download_link_id) REFERENCES download_links(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Paiement : idempotence des webhooks ================================
CREATE TABLE stripe_events (
  id            VARCHAR(255) PRIMARY KEY,    -- evt_…
  type          VARCHAR(100) NOT NULL,
  processed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Administration =====================================================
CREATE TABLE admin_users (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email            VARCHAR(190) NOT NULL UNIQUE,
  name             VARCHAR(100) NOT NULL,
  password_hash    VARCHAR(255) NOT NULL,     -- password_hash(PASSWORD_ARGON2ID)
  failed_attempts  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until     DATETIME NULL,
  last_login_at    DATETIME NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_logs (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id     INT UNSIGNED NULL,
  action       VARCHAR(60) NOT NULL,          -- product.update, order.refund_seen, login.failed…
  entity_type  VARCHAR(40) NULL,
  entity_id    INT UNSIGNED NULL,
  details      JSON NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_alog_admin FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Réglages modifiables depuis le back-office
CREATE TABLE settings (
  `key`   VARCHAR(80) PRIMARY KEY,
  `value` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- ex. download_link_days=30, download_max_count=5, instagram_url, tiktok_url, contact_email
```

### 3.3 Choix de conception à noter

- **Packs = produits** (`type='pack'`) : ils apparaissent dans la boutique, ont un prix, une image et une page, exactement comme un produit simple. À l'achat, le `FulfillmentService` « développe » le pack en un lien par PDF contenu.
- **Panier en session PHP**, sans table : pour du numérique, la quantité est toujours de 1. Le prix est **toujours recalculé côté serveur** depuis la base au moment du paiement, jamais repris du navigateur.
- **Codes promo gérés dans Stripe** (Promotion Codes, `allow_promotion_codes`) : création depuis le tableau de bord Stripe, sans table dédiée en V1. Le code et la remise sont enregistrés sur la commande pour les statistiques.
- **Produits les plus vendus** : calculés via `order_items` joint aux commandes `paid`. Aucun compteur à maintenir.
- **Archivage plutôt que suppression** dès qu'un produit a été vendu (`ON DELETE RESTRICT` sur les fichiers), pour que les liens des anciens clients restent valides.

---

## 4. Fonctionnalités à développer en priorité

Ordre fidèle au cahier des charges (une validation à la fin de chaque phase) :

| Phase | Contenu | Livrable à valider |
|---|---|---|
| **2. Interface** (données fictives) | Design system CSS (couleurs, typos, boutons, cartes), header avec panier, footer, accueil (hero + mascotte, populaires, catégories, avantages, packs), boutique (recherche, filtres, tris), page catégorie, fiche produit (aperçus, « Vous pourriez aussi aimer »), panier, pages légales (gabarits) | Site navigable sur mobile et ordinateur, avec captures d'écran |
| **3. Base de données + admin** | Migrations SQL, connexion admin sécurisée, CRUD catégories, CRUD produits (upload image, PDF, aperçus), création de packs, statut brouillon/publié/archivé, liste et détail des commandes, tableau de bord, réglages | Boutique administrable : les données fictives sont remplacées par la base |
| **4. Paiement + téléchargements** | Stripe Checkout (mode test), webhooks signés et idempotents, création des commandes, liens sécurisés (expiration et quota), email de confirmation, page « Retrouver mes achats », gestion des remboursements et échecs | Achat de bout en bout en mode test Stripe |
| **5. Tests + mise en production** | Tests mobiles (Safari iOS, Chrome Android, navigateurs intégrés TikTok/Instagram), tests de paiement, emails (SPF/DKIM), sécurité, performances, SEO (sitemap, JSON-LD), sauvegardes, déploiement LWS, passage Stripe en mode live | V1 commerciale en ligne |

**Le chemin critique pour vendre** : fiche produit → paiement Stripe → webhook → email avec lien → téléchargement. Tout le reste (filtres, tableau de bord détaillé…) améliore l'expérience, mais ne bloque pas la vente.

**Suggestion inspirée de Beacons.ai (facultative, peu coûteuse)** : une page `/liens` de type « lien en bio » (avatar mascotte, boutons vers les best-sellers, la boutique, TikTok, Instagram), à mettre en lien dans les bios TikTok et Instagram.

---

## 5. Difficultés et points de vigilance

### 5.1 Juridique et fiscal (à trancher **avant** la phase 4)

1. **Droit de rétractation (art. L221-28 13° du Code de la consommation)** : pour livrer un PDF immédiatement, le client doit **donner son accord exprès** et **renoncer explicitement** à son droit de rétractation de 14 jours. Prévoir une case à cocher obligatoire (non pré-cochée) avant le paiement, un horodatage en base (`withdrawal_waiver_at`) et un rappel dans l'email de confirmation. Sans cela, le client peut demander un remboursement pendant 14 jours, même après le téléchargement.
2. **TVA** : tout dépend du **statut juridique** (micro-entreprise ? société ? association ?).
   - En **franchise en base de TVA**, aucune TVA n'est facturée, mais la mention « TVA non applicable, art. 293 B du CGI » est obligatoire.
   - Les ventes de services numériques à des particuliers d'autres pays de l'UE restent soumises à la TVA française tant qu'elles ne dépassent pas **10 000 € par an**. Au-delà, il faut appliquer la TVA du pays du client (guichet unique OSS).
   - **Stripe Tax** automatise ce calcul, mais c'est un service payant (commission par transaction). On peut le désactiver au départ et l'activer plus tard sans modifier le code.
   - → **À confirmer avec un expert-comptable.**
3. **Pages légales** (mentions, CGV, confidentialité) : je fournirai des gabarits structurés, mais le contenu doit refléter vos informations réelles (SIRET, adresse, statut). Je n'inventerai aucune donnée légale. Une relecture par un professionnel est recommandée.
4. **Contenu à caractère médical** : prévoir une mention indiquant que les supports sont pédagogiques et ne remplacent ni les protocoles de service ni l'encadrement en stage.

### 5.2 Technique

5. **Navigateurs intégrés TikTok/Instagram (point le plus important pour le mobile)** : ces webviews perdent souvent la session quand on bascule vers Safari ou Chrome, gèrent mal Apple Pay, et **le téléchargement de fichiers y échoue souvent sur iOS**. Mesures prévues : bouton « Acheter maintenant » qui mène directement au paiement (sans passer par le panier), **email systématique avec les liens**, message « Ouvrir dans le navigateur » si une webview est détectée, et liens valables plusieurs fois.
6. **Ne jamais se fier à la page de succès** : seul le webhook (signature vérifiée avec `STRIPE_WEBHOOK_SECRET`) valide une commande. Il faut gérer les arrivées dans le désordre et les doublons d'événements (table `stripe_events`).
7. **Contraintes de l'hébergement mutualisé LWS** à vérifier sur votre offre :
   - possibilité de pointer le domaine sur `public/` (sinon on placera le code hors du dossier web de LWS) ;
   - version de PHP ;
   - accès SSH et Composer (sinon on enverra `vendor/` par FTP) ;
   - cron ;
   - limite `upload_max_filesize` (vos PDF font-ils plus de 20 Mo ?).
8. **Aperçus des PDF** : générer automatiquement des miniatures nécessite Imagick/Ghostscript, souvent absents en mutualisé. En V1, les aperçus seront des images (PNG/WebP) que vous exporterez depuis Canva et importerez dans l'admin.
9. **Délivrabilité des emails** : configurer **SPF, DKIM et DMARC** sur `lapetiteide.fr` chez LWS. Sinon, les liens de téléchargement risquent d'arriver en spam.
10. **Partage non autorisé des PDF** : on ne peut pas l'empêcher totalement, seulement le **limiter** (liens à durée et quota limités, révocation en cas de remboursement). Piste pour la V1.1 : un **filigrane** avec l'email de l'acheteur sur chaque page, qui dissuade efficacement mais demande une bibliothèque PDF (FPDI) et plus de calcul serveur.
11. **Traceurs marketing** : les pixels TikTok/Meta imposent un bandeau de consentement CNIL. Pour la V1, le suivi des ventes peut se faire sans traceur (tableau de bord admin et Stripe, avec des paramètres UTM sur les liens en bio).
12. **Sécurité** :
    - PDO avec requêtes préparées et `e()` systématique ;
    - jetons CSRF sur tous les formulaires ;
    - sessions `HttpOnly`/`Secure`/`SameSite` ;
    - Argon2id pour les mots de passe et verrouillage après plusieurs échecs de connexion ;
    - validation MIME réelle des fichiers importés (`finfo`) ;
    - en-têtes de sécurité (CSP, HSTS) ;
    - `.env` hors du web et jamais commité.
13. **Sauvegardes** : vérifier les sauvegardes incluses chez LWS, et ajouter un dump quotidien de la base et des PDF par cron, avec une copie hors serveur.

---

## 6. Questions à valider avant la phase 2

1. **Architecture** : validez-vous PHP natif + MySQL sur LWS, Stripe Checkout et Brevo (plutôt que Vercel/Supabase) ?
2. **Hébergement** : quelle offre LWS avez-vous (nom exact) ? A-t-elle un accès SSH ?
3. **Statut juridique et régime de TVA** de La Petite IDE ? (Indispensable pour les CGV, les factures et Stripe.)
4. **Stripe** : le compte est-il déjà créé ?
5. **Éléments graphiques** : avez-vous le logo et la mascotte en haute définition (SVG ou PNG transparent), et quelques visuels de produits ?
6. **Catalogue** : combien de produits au lancement ? Quelles fourchettes de prix ?
7. **Téléchargements** : valeurs par défaut proposées : **liens valables 30 jours, 5 téléchargements par fichier**, plus un renvoi par email via « Retrouver mes achats ». Cela vous convient-il ?
8. **Page `/liens`** façon Beacons pour la bio TikTok/Instagram : la voulez-vous dans la V1 ?

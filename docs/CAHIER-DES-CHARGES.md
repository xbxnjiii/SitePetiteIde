# La Petite IDE — Cahier des charges V1 (version simplifiée)

> Statut : **validé** (6 nov. 2026) — livraison par lien sécurisé valable 30 jours, un seul pack au lancement (Pack des constantes, 2,99 € TTC au lancement, 3,99 € depuis le 8 nov. 2026).
> Date : 6 novembre 2026

---

## 1. Objectif

Une **page de vente minimaliste façon Beacons.ai**, pensée pour le trafic TikTok et Instagram sur mobile :

> L'étudiant·e clique sur le lien en bio → voit les packs → ouvre la page de vente d'un pack →
> paie en un geste (Apple Pay, Google Pay ou carte) → reçoit ses PDF par email.

**Règle directrice : chaque écran a une seule action.** Pas de compte, pas de panier, pas de catalogue à filtrer, pas de back-office à maintenir.

---

## 2. Parcours utilisateur

```
Lien en bio (TikTok / Insta)
        │
        ▼
① Page d'accueil « lien en bio »         lapetiteide.fr
   Mascotte, accroche, liens réseaux, liste des packs (grandes cartes)
        │  clic sur un pack
        ▼
② Page de vente du pack                  lapetiteide.fr/pack-des-constantes
   Visuel, prix, contenu du pack, aperçus, bouton « Acheter »
        │  clic « Acheter »
        ▼
③ Paiement Stripe (page sécurisée)       Apple Pay / Google Pay / carte, code promo
   Saisie de l'email + case CGV et renonciation à la rétractation
        │  paiement validé
        ▼
④ Page de remerciement                   « Merci ! Ton pack arrive par email » + bouton de téléchargement
        +
⑤ Email automatique                       Récapitulatif + lien(s) de téléchargement
```

Soit **3 clics entre le lien en bio et le paiement**.

---

## 3. Pages

### ① Accueil « lien en bio » (`/`)
- Logo et mascotte, accroche en une phrase (ex. « Tes études infirmières, un peu plus simples au quotidien ! »).
- Icônes TikTok et Instagram, plus un lien de contact.
- **Liste des packs** sous forme de grandes cartes cliquables : visuel, nom, prix (et prix barré s'il y en a un), badge facultatif (« Nouveau », « Best-seller »).
- Pensée d'abord pour le téléphone, en une seule colonne, comme Beacons. Sur ordinateur, la colonne est centrée.

### ② Page de vente d'un pack (`/[nom-du-pack]`)
- Visuel principal et 2 ou 3 aperçus de pages (faciles à agrandir en touchant l'image).
- Nom, prix, phrase d'accroche.
- **« Ce que contient le pack »** : liste des fiches incluses, nombre de pages, format PDF.
- 3 rassurances : téléchargement immédiat, envoi par email, lisible sur téléphone ou à imprimer.
- **Bouton « Acheter »** toujours visible sur mobile (barre fixe en bas de l'écran).
- Courte FAQ (3 ou 4 questions) et rappel des autres packs en bas de page.

### ③ Paiement (page hébergée par Stripe)
- Apple Pay, Google Pay et carte bancaire. 3-D Secure géré par Stripe.
- Seule information demandée : **l'email**. Pas de nom, pas d'adresse.
- Case obligatoire : acceptation des CGV et **renonciation au droit de rétractation** pour un accès immédiat (obligation légale).
- Champ code promo (codes créés dans Stripe).

### ④ Page de remerciement (`/merci`)
- Le site vérifie lui-même auprès de Stripe que le paiement est bien validé. Il ne se fie jamais à la simple redirection.
- Message de confirmation, bouton « Télécharger mes fiches », rappel « Tu as aussi reçu un email ».
- Astuce affichée si la page est ouverte dans TikTok ou Instagram : « Ouvre dans Safari ou Chrome pour télécharger ».

### ⑤ Email de confirmation
- Envoyé automatiquement dès que Stripe confirme le paiement (webhook).
- Contenu : récapitulatif (pack, prix, numéro de commande), **lien(s) de téléchargement**, contact en cas de souci.
- Stripe envoie en plus son propre reçu de paiement.

### Pages obligatoires (accessibles en pied de page)
Mentions légales, CGV, politique de confidentialité, contact (email et réseaux sociaux).

---

## 4. Livraison des fichiers

**Recommandation : un lien de téléchargement sécurisé dans l'email**, plutôt que le PDF en pièce jointe.

| | Lien sécurisé (recommandé) | PDF en pièce jointe |
|---|---|---|
| Délivrabilité | ✅ Email léger, arrive bien en boîte de réception | ⚠️ Les emails lourds tombent plus souvent en spam ; Gmail limite à 25 Mo |
| Packs volumineux | ✅ Aucune limite | ❌ Bloqué au-delà de 25 Mo |
| Partage non autorisé | ✅ Lien qui expire après X jours | ❌ Le fichier circule librement |
| Simplicité pour le client | ✅ Un clic | ✅ Rien à faire |

- Chaque lien est personnel et signé, et expire après **30 jours** (durée à valider).
- Les PDF sont stockés dans un espace privé (Cloudflare R2) : ils n'ont jamais d'adresse publique.
- Lien perdu ou expiré : en V1, le client contacte La Petite IDE, qui renvoie l'email de livraison. Un bouton « Renvoyer mes fiches » en libre-service est envisagé pour la V1.1.

---

## 5. Gestion des packs

Pas de back-office : avec un seul pack (puis quelques-uns), la solution la plus simple est un **fichier de configuration**
(`src/content/packs.ts`) qui décrit chaque pack : nom, prix, textes, contenu, fichiers PDF.

| Besoin | Comment |
|---|---|
| Ajouter ou modifier un pack | Modifier `src/content/packs.ts` (ou le demander au développeur), puis `npm run stripe:sync` met Stripe à jour automatiquement |
| Déposer le PDF d'un pack | Cloudflare → R2 → bucket `la-petite-ide-pdfs` → *Upload* |
| Voir les ventes, rembourser, créer un code promo | Tableau de bord Stripe |

*(Version initiale de ce document : catalogue géré dans Stripe. Abandonné car trop complexe pour un seul pack.)*

---

## 6. Technique

| Brique | Choix | Coût |
|---|---|---|
| Site | Next.js sur **Cloudflare Workers** (déjà en place) | 0 € (offre gratuite a priori suffisante : le site actuel pèse environ 1 Mo compressé) |
| Fichiers PDF | **Cloudflare R2**, bucket privé | 0 € (jusqu'à 10 Go) |
| Paiement + historique des commandes | **Stripe Checkout** | Commission par vente uniquement |
| Emails | **Resend**, envoyé depuis `contact@lapetiteide.fr` | 0 € (jusqu'à 3 000 emails/mois) |
| Statistiques de visites | **Cloudflare Web Analytics** (sans cookie, donc sans bandeau de consentement) | 0 € |
| Base de données | **Aucune** : les commandes sont dans Stripe, les fichiers dans R2 | — |

**Supabase n'est plus nécessaire.** Cela supprime le risque de mise en pause de la base, les sauvegardes à gérer et un compte de plus.

Sécurité :
- les clés Stripe et Resend sont stockées dans les secrets Cloudflare, jamais dans le code ;
- la signature des webhooks Stripe est vérifiée ;
- les liens de téléchargement sont signés et expirent ;
- un même paiement ne déclenche jamais deux envois d'email.

**Coût total : 0 €/mois**, en dehors des commissions Stripe.

---

## 7. Juridique (inchangé et toujours obligatoire)

- **Renonciation au droit de rétractation** : une case dans le paiement Stripe, avec horodatage conservé chez Stripe.
- **Mentions légales, CGV, politique de confidentialité** : les gabarits existent déjà. Ils sont à compléter avec vos informations (statut, SIRET, adresse).
- **TVA** : dépend de votre statut. Stripe Tax peut s'activer plus tard si nécessaire. → À confirmer avec un comptable.
- **Données personnelles** : uniquement l'email et le pays de l'acheteur, stockés chez Stripe.

---

## 8. Hors périmètre V1 (possible plus tard)

Panier multi-packs · compte client · back-office maison · avis clients · parrainage · abonnements ·
pixels publicitaires TikTok et Meta (ils imposent un bandeau cookies) · ventes à l'unité si seuls les packs sont vendus.

---

## 9. Ce qu'on garde du travail déjà fait

| Élément existant | Devenir |
|---|---|
| Charte graphique, polices, composants visuels | ✅ Conservés |
| Fiche produit (galerie, contenu du pack, barre d'achat mobile) | ✅ Devient la page de vente |
| Pages légales, FAQ, page 404 | ✅ Conservées, simplifiées |
| Hébergement Cloudflare (OpenNext) | ✅ Conservé |
| Boutique (recherche, filtres, tris), catégories, panier | ❌ Supprimés |
| Accueil actuel | 🔄 Remplacé par la page « lien en bio » |

---

## 10. Étapes

| Étape | Contenu | Ce que vous validez |
|---|---|---|
| **A. Maquette** | Page « lien en bio » + page de vente + page de remerciement, avec des packs fictifs | Le rendu sur votre téléphone (URL d'aperçu Cloudflare) |
| **B. Paiement et livraison** | Lecture des packs depuis Stripe, paiement en mode test, webhook, email Resend, téléchargement depuis R2 | Un achat test complet : paiement → email → PDF |
| **C. Mise en ligne** | Vrais packs et visuels, pages légales complétées, domaine `lapetiteide.fr`, Stripe en mode réel | Le lien à mettre en bio |

---

## 11. Questions à valider

1. **Livraison** : lien sécurisé dans l'email (recommandé) ou PDF en pièce jointe ?
2. **Gestion des packs depuis Stripe** (recommandé) : cela vous convient-il ?
3. **Vente** : uniquement des packs, ou aussi des fiches à l'unité ?
4. **Durée de validité des liens** : 30 jours, cela vous va ?
5. **Contenu au lancement** : combien de packs, avec quels noms et quels prix ?
6. **Visuels** : logo, mascotte et couvertures des packs (toujours attendus).

# Plan d'Action : Phases 2, 3 et 4 (Mise à Jour selon Feedback)

Voici le plan détaillé pour exécuter les phases restantes, en prenant en compte vos directives spécifiques (notamment pour AWS App Runner et l'UI des préférences).

---

## Phase 2 : Fiabilisation de l'Observabilité (Cockpit Stratégique)

### 1. Remplacement des Mocks dans le Dashboard
- **Fichier visé :** `app/pages/dashboard/index.vue` (ou le composant qui rend les graphiques).
- **Action :** Supprimer les données statiques (mocks).
- **Backend :** Créer/Vérifier un endpoint API (ex: `/api/dashboard/metrics`) qui effectue des requêtes agrégées via Drizzle sur la table `email_log` (compter les succès vs échecs par contexte, par date, etc.).
- **Frontend :** Brancher les graphiques (type vue-chartjs) sur les résultats de cet endpoint.

### 2. Monitoring et Gestion des Files d'Attente (Page Mail Metrics)
- **Fichier visé :** La page "mail metric" (vraisemblablement dans `app/pages/dashboard/com/metrics.vue` ou similaire) et la section "programmation".
- **Action UI :** Ajouter une action de suppression (bouton "Supprimer la sélection") dans le tableau de la file d'attente.
- **Backend :** 
  - S'assurer que le scheduler met à jour les statuts en base (`email_log` / `email_queue`) pour un retour en temps réel.
  - Créer un endpoint d'API sécurisé `DELETE /api/queue` pour permettre la suppression des emails programmés en attente.
- **Intégration Frontend :** Envoyer une requête `DELETE` avec les IDs sélectionnés pour purger la file d'attente et rafraîchir l'interface (actuellement, seul l'export fonctionnait).

---

## Phase 3 : Finalisation de la Granularité des Consentements (RGPD)

### 1. Mise à jour de l'UI des Préférences Utilisateur
- **Fichier visé :** Page de configuration/settings (`app/pages/settings/...`).
- **Action :** 
  - Séparer la gestion des notifications liées aux "mentions" : proposer un switch pour les "Mentions In-App" (badge/cloche) et un switch séparé pour les "Emails de mention" (actuellement couplés).
  - Intégrer les switchs de consentement isolés pour les campagnes : `Newsletter`, `Changelog`, et `Promotion/Offres`.
- **Backend :** Mettre à jour l'endpoint d'enregistrement du profil pour qu'il sauvegarde précisément les booléens correspondants dans la table `audience` (`optInNewsletter`, `optInMarketing`, et un éventuel `optInMentionMail`).

### 2. Liaison avec le Studio de Campagne
- **Fichier visé :** Interface de création du Studio.
- **Action :** 
  - Permettre à l'éditeur de sélectionner le "Contexte de Campagne" (Newsletter, Changelog, Promo).
  - Prévisualiser dynamiquement l'alias d'expédition (`MAIL_SENDER_...`) en fonction du contexte sélectionné pour rassurer l'expéditeur.
  - S'assurer que le ciblage d'audience pré-calcule le nombre de destinataires réels ayant consenti à ce contexte spécifique.

---

## Phase 4 : Agnosticisme Total et Déploiement Souverain

### 1. Stratégie de Déploiement (AWS App Runner)
- **Annulation Docker :** Retrait de toute consigne Docker.
- **Fichier visé :** `apprunner.yaml` (déjà existant à la racine).
- **Action :** Vérifier que le fichier configure correctement la commande de build (`npm run build`) et la commande de start pour Nitro (`node .output/server/index.mjs`), ainsi que l'exposition du bon port (souvent 3000).

### 2. Nettoyage Vercel ("Vercel-Free")
- **Action :** Rechercher et supprimer toute dépendance, fichier de configuration (ex: `vercel.json` si présent), et variables d'environnement Vercel.
- **Exception :** Conserver expressément l'écosystème Vercel AI SDK utilisé pour le module de l'assistant IA (ne pas toucher aux dépendances comme `@vercel/oidc` mentionnées dans le nuxt.config).

### 3. Tests et Validation
- **Action :** Puisque le redémarrage d'App Runner est géré par AWS, s'assurer simplement que le `scheduler-boot.ts` démarre correctement et reprend les jobs "zombies" à chaque nouveau déploiement automatique déclenché par un push sur le dépôt.
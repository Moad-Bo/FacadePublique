# Rapport d'Analyse : État de l'Application Façade Publique

## 1. Compréhension de l'Application (But et Aspect Technique)

**But du projet :**
Façade Publique est une plateforme de communication stratégique et de gestion communautaire. Elle est conçue pour être souveraine, totalement agnostique vis-à-vis des hébergeurs cloud spécifiques (notamment "Vercel-free"), et offre une gestion hautement granulaire de la délivrabilité des emails (gestion fine des opt-ins et routage intelligent par contexte).

**Aspects Techniques et Architecture :**
- **Framework Core :** Nuxt 4 (structure `/app`) couplé à un serveur Nitro (Node.js).
- **Base de Données :** Architecture centralisée sur TiDB (compatible MySQL) via Drizzle ORM.
- **Moteur de Communication :** Système de routage intelligent géré par contexte (Système, Campagne, Support, Modération) via un `email-router.ts` qui assure le respect des règles de blocage et de consentement avant tout appel à l'API (Mailgun).
- **Stockage / Assets :** Approche hybride utilisant AWS S3 (pour les accès privés/signés) et Cloudflare R2 (pour le public/Egress-free), garantissant l'indépendance vis-à-vis du système de fichiers Vercel.
- **Authentification & RBAC :** Utilisation de Better Auth avec une gestion très fine des permissions par rôles.
- **Ordonnanceur (Scheduler) :** Les anciens "Cron Jobs" de Vercel ont été remplacés par un plugin Nitro local (`server/plugins/scheduler.ts`) avec récupération des "jobs zombies" au démarrage pour assurer la résilience.

**État Actuel (Audit du 30 Avril) :**
- **Stabilité :** Très bonne (95%). Le typage TypeScript (`nuxt typecheck`) passe sans erreur.
- **Backend :** La réforme "Vercel-free" est réalisée à 85%. L'application est agnostique, mais nécessite une finalisation du déploiement Docker/PM2.
- **Délivrabilité :** Fonctionnelle (Stop-Gate, calcul de spam, fallback SMTP implémentés), mais l'unification des alias dynamiques reste à finaliser.
- **Observabilité :** Le "Cockpit Stratégique" (Dashboard) est structurellement en place, mais l'accueil utilise encore des données mockées plutôt que les vraies métriques de TiDB.

---

# Plan d'Amélioration et de Stabilisation

L'objectif ici n'est pas d'ajouter de nouvelles fonctionnalités, mais de stabiliser l'existant, d'améliorer la fiabilité et de terminer la transition technique amorcée.

## Phase 1 : Sécurisation et Unification des Configurations (Délivrabilité)
- **Centraliser les Alias d'Envoi :** Migrer la logique complexe des variables d'environnement (`mailgunSenderContexts`) vers le fichier de configuration centralisé `CAMPAIGN_CONTEXT_CONFIG`. Cela garantira une source de vérité unique pour le routage des emails. et verifier que l'on utilise bien les variable
- MAIl_DOMAIN= pour faire pointer les alias vers les context et non plus utiliser la variable  "MAILL_DOMAIN"MAILGUN_SENDER_CONTEXTS=' 
- **Validation du Routage :** S'assurer que chaque communication passe exclusivement par `email-router.ts` pour que la Stop-Gate et les vérifications de consentement soient infaillibles.
- **verifie que l'envoie de campagne s'integre bien avec le scheduler 
## Phase 2 : Fiabilisation de l'Observabilité (Cockpit Stratégique)
- **Remplacement des Mocks :** Connecter les graphiques de la page d'accueil du dashboard (`index.vue`) aux véritables données de la table `email_log` via Drizzle.
- **Monitoring des files d'attente :** S'assurer que les tables de logs et de file d'attente remontent les échecs et succès en temps réel pour une vraie observabilité des performances d'envoi et que l'on puisse supprimer des programmation d'envoie en attente depuis la page mail metric programmation.
- **ajouter a la pge mail metric dans la section programmation l"envoie de requete depuis le front-end pour supprimer les envoie en attente selectionner depuis le tableau actuellement seul l'export s'effectuer et non la mise a jour de la queue
- 
## Phase 3 : Finalisation de la Granularité des Consentements (RGPD)
- **Mise en place de l'UI de Préférences ( l'ui existe dans la page setting accesible par tt les utilisateur connecter il faut update le fait de pouvoir choisir de maniere plus granulaire le fait de recevoir les mention in app ou et par mail egalement actuellement les deux vont de pair et ne sont pas differencier ) :** Développer ou finaliser l'interface (Centre de Préférences) permettant à l'utilisateur de modifier précisément ses abonnements (Newsletter, Changelog, Promo, etc.), puisque l'infrastructure backend (table `audience` avec `optInChangelog`, etc.) est déjà prête.
- **Liaison avec le Studio :** Brancher le Studio de création de campagnes sur ces nouveaux contextes pour garantir un ciblage précis et prévisualiser les bons alias.

## Phase 4 : Agnosticisme Total et Déploiement Souverain
- **Conteneurisation Finale ( annuler ) :** Achever la configuration Docker on utilise pas docker on push le repo vers aws app runer et on le configure grace a un fichier appruner.yaml et PM2 pour rendre l'application 100% indépendante de Vercel pour rendre l'app independante de vercel il faut retirer les mention a vercel pour .
- **Nettoyage :** Supprimer toutes les références, dépendances et variables d'environnement spécifiques à Vercel pour valider définitivement le statut "Vercel-free"(sauf celle pour l'assistant ia qui utilise vercel ai sdk ) .
- **Tests de Résilience :** Valider le mécanisme de redémarrage du scheduler local (`scheduler-boot.ts`) en environnement conteneurisé pas besoin vue que non conteneuriser .
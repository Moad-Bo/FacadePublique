# Rapport sur le Système de Communication : Granularité et Contextes

Ce rapport analyse la manière dont est établie la granularité du système de routage d'emails actuel (via `EmailContext` et `email-router.ts`) et identifie les causes du "bazar" dans les variables d'environnement.

## 1. Comment la granularité est-elle établie actuellement ?

Le backend définit un enum strict (`EmailContext` dans `server/utils/email-router.ts`) pour séparer les flux et gérer les consentements (RGPD) ainsi que la réputation de domaine :

### A. Les flux système et transactionnels
1. **`EmailContext.SYSTEM`**, **`COMMUNITY_TX`**, **`BLOG_TX`**
   - **Routage :** API Mailgun.
   - **Domaine :** `MAIL_DOMAIN_SYSTEM` (ex: `system@support.techkne.com`).
   - **Contrôle RGPD :** Pour `COMMUNITY_TX` et `BLOG_TX`, le routeur vérifie le champ `optInForum` dans la base de données.

### B. Les flux Webmailer / Manuel
2. **`EmailContext.WEBMAILER`** et **`EmailContext.MODERATION`**
   - **Routage :** SMTP classique (pour être utilisé par une interface mail type client).
   - **Domaine :** `MAIL_DOMAIN_SUPPORT` ou config spécifique pour la modération.
   - **Contrôle RGPD :** Pas de restriction forte automatisée, car ce sont souvent des réponses directes au support.

### C. Les flux Campagnes / Marketing (Isolés pour protéger la réputation)
3. **`EmailContext.CAMPAIGN_NEWSLETTER`**, **`CAMPAIGN_CHANGELOG`**, **`CAMPAIGN_PROMO`**
   - **Routage :** API Mailgun.
   - **Domaine :** Variables indépendantes (`MAIL_DOMAIN_CAMPAIGN_NEWSLETTER`, etc.).
   - **Contrôle RGPD :** Validation stricte via la table `audience` (`optInNewsletter` pour Newsletter et Changelog, `optInMarketing` pour Promo) via la constante `CAMPAIGN_CONTEXT_CONFIG`.

## 2. Pourquoi "c'est le bazar" dans le fichier `.env` ?

Actuellement, l'application est dans une phase de transition (probablement entre une ancienne version avec des variables "fourre-tout" et la nouvelle version plus granulaire).

1. **Redondance des variables :**
   Il y a à la fois :
   - `MAIL_DOMAIN_MARKETING` (utilisé par le routeur de base ?)
   - `MAIL_DOMAIN_CAMPAIGN_PROMO` (nouveau format)
   - `MAIL_DOMAIN_SUPPORT` en doublon à plusieurs endroits.
   - La variable obsolète `MAILGUN_SENDER_CONTEXTS` (encore présente et formatée en chaîne de caractères séparée par des virgules).

2. **Nommage ambigu :**
   Les variables s'appellent `MAIL_DOMAIN_...` mais contiennent en réalité des *adresses complètes* (ex: `system@support.techkne.com`), ce qui oblige le `nuxt.config.ts` à faire des `.split('@').pop()` pour récupérer le nom de domaine réel de l'API.

3. **Multiplication des points d'entrée :**
   La configuration pour les envois sortants (API) se mélange avec la configuration SMTP entrante et sortante du webmailer manuel (`SMTP_USER`, `MAIL_DOMAIN_CONTACT`, etc.).

## 3. Plan d'action pour assainir le système

Pour avoir un `.env` propre, il faut aligner les variables d'environnement sur les contextes réels définis dans `EmailContext` et séparer clairement l'adresse de l'expéditeur du nom de domaine d'API.

### Recommandations de nettoyage :

**1. Définir un domaine API racine (Un seul)**
```env
# Mailgun API (Nom de domaine d'envoi principal)
MAILGUN_API_DOMAIN="support.techkne.com"
```

**2. Uniformiser les alias d'expédition (Adresses complètes)**
Remplacer les anciens `MAIL_DOMAIN_` par `MAIL_SENDER_` pour que ce soit sémantiquement correct :
```env
# --- EXPÉDITEURS : SYSTÈME ET TRANSACTIONNEL (API) ---
MAIL_SENDER_SYSTEM="system@support.techkne.com"

# --- EXPÉDITEURS : CAMPAGNES (API - Isolation de réputation) ---
MAIL_SENDER_NEWSLETTER="newsletter@support.techkne.com"
MAIL_SENDER_CHANGELOG="changelog@support.techkne.com"
MAIL_SENDER_PROMO="marketing@support.techkne.com"

# --- EXPÉDITEURS : SUPPORT ET MANUEL (SMTP) ---
MAIL_SENDER_SUPPORT="support@support.techkne.com"
MAIL_SENDER_CONTACT="contact@support.techkne.com"
MAIL_SENDER_MODERATION="moderation@support.techkne.com"
```

**3. Mettre à jour `nuxt.config.ts` et `email-router.ts`**
- Supprimer définitivement la logique basée sur `MAILGUN_SENDER_CONTEXTS`.
- Dans `nuxt.config.ts`, faire directement passer ces alias propres (`MAIL_SENDER_...`).
- Le `email-router.ts` utilisera ces alias pour l'expéditeur et se basera toujours sur `MAILGUN_API_DOMAIN` pour son routage API de base.
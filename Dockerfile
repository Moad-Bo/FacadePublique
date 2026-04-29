# ╔══════════════════════════════════════════════════════════════════════╗
# ║  Dockerfile — FacadePublique / Techknè                               ║
# ║  Cible : AWS App Runner (node-server persistant)                     ║
# ║  Stratégie : Multi-Stage Build (builder + runner Alpine)             ║
# ╚══════════════════════════════════════════════════════════════════════╝

# ─── Stage 1 : Builder ────────────────────────────────────────────────────────
# Contient les devDependencies et le compilateur TypeScript.
# Cet layer ne fera PAS partie de l'image finale.
FROM node:22-alpine AS builder

# Dépendances systèmes minimales pour les modules natifs (ex: better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 1. Copie des manifestes en premier pour maximiser le cache Docker
#    (si package.json n'a pas changé, cette couche est réutilisée)
COPY package.json package-lock.json ./

# 2. Installation de TOUTES les dépendances (dev incluses pour le build)
RUN npm ci

# 3. Copie du code source
COPY . .

# 4. Variables de build publiques (non-secrètes)
#    Les secrets (.env) sont injectés par App Runner au runtime
ARG NUXT_PUBLIC_AUTH_BASE_URL=https://facadepublique.com
ENV NUXT_PUBLIC_AUTH_BASE_URL=$NUXT_PUBLIC_AUTH_BASE_URL

# 5. Build Nuxt en mode node-server (standalone)
#    Génère .output/ avec le serveur Nitro complet
RUN npm run build

# ─── Stage 2 : Runner ────────────────────────────────────────────────────────
# Image finale légère — contient uniquement les artifacts de production.
# Taille cible : ~200MB (vs ~1GB si on copiait tout)
FROM node:22-alpine AS runner

# Dépendances systèmes runtime (SSL pour TiDB, timezone)
RUN apk add --no-cache tzdata ca-certificates

WORKDIR /app

# Copie uniquement le build compilé depuis le stage builder
COPY --from=builder /app/.output ./.output

# ─── Variables d'environnement ────────────────────────────────────────────────
# NODE_ENV et PORT sont les seules variables fixées dans l'image.
# TOUTES les autres variables sensibles (MAILGUN_API_KEY, TIDB_PASSWORD, etc.)
# doivent être injectées par AWS App Runner via son gestionnaire de secrets.
ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=Europe/Paris

# Port exposé par le serveur Nitro
EXPOSE 3000

# ─── Health Check ────────────────────────────────────────────────────────────
# AWS App Runner utilise ce check pour valider que le conteneur est prêt.
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health 2>/dev/null || exit 1

# ─── Démarrage ───────────────────────────────────────────────────────────────
# Nitro standalone — aucune dépendance externe requise
CMD ["node", ".output/server/index.mjs"]

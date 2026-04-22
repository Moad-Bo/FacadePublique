import { createAuthClient } from "better-auth/vue"
import { adminClient } from "better-auth/client/plugins"

// En same-origin (browser → même serveur Nuxt), better-auth résout automatiquement les routes /api/auth/*
// Pas besoin de baseURL explicite ni de credentials:include (same-origin cookies sont envoyés automatiquement)
export const authClient = createAuthClient({
  plugins: [
    adminClient()
  ]
})

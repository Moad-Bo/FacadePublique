/**
 * vitest.config.ts
 * Configuration Vitest optimisée pour le backend Nitro/Nuxt
 * 
 * - Environnement Node (pas jsdom — code server-only)
 * - Alias pour les auto-imports Nuxt (#imports)
 * - Variables d'env mockées pour isoler les tests des vraies ressources
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Environnement Node pour le code serveur (Nitro)
    environment: 'node',
    
    // Fichiers de test ciblés
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    
    // Timeout global (en ms) pour éviter les deadlocks sur des mocks lents
    testTimeout: 10000,

    // Variables d'environnement injectées pour les tests
    // NE PAS METTRE DE VRAIES CLÉS ICI — utiliser uniquement des fausses valeurs de test
    env: {
      NODE_ENV: 'test',
      BETTER_AUTH_SECRET: 'vitest-secret-key-not-real',
      BETTER_AUTH_URL: 'http://localhost:3000',
      // Domaine unique actif pour les tests d'intégration
      MAIL_DOMAIN_SYSTEM: 'support.techkne.com',
      MAIL_DOMAIN_MARKETING: 'support.techkne.com',
      MAIL_DOMAIN_SUPPORT: 'support.techkne.com',
      CLOUDFRONT_DOMAIN: 'assets.techkne.com',
      CLOUDFRONT_KEY_PAIR_ID: 'K3VITEST00000',
      CLOUDFRONT_PRIVATE_KEY: '-----BEGIN RSA PRIVATE KEY-----\nMOCKED_KEY_FOR_TESTING\n-----END RSA PRIVATE KEY-----',
      // Mailgun — clé invalide pour s'assurer qu'aucun vrai email n'est envoyé
      MAILGUN_API_KEY: 'VITEST_MOCK_KEY_DO_NOT_USE',
      AWS_S3_BUCKET_NAME: 'techkne-vitest-mock',
      AWS_REGION: 'eu-west-1',
    },

    // Couverture de code
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['server/utils/**/*.ts', 'server/services/**/*.ts'],
      exclude: ['server/utils/db.ts', 'server/utils/auth.ts'],
    },
  },

  resolve: {
    alias: {
      // Aliases Nuxt auto-imports → stubs pour les tests
      '#imports': resolve(__dirname, 'tests/__mocks__/nuxt-imports.ts'),
      '~': resolve(__dirname, 'app'),
      '~~': resolve(__dirname, '.'),
      // Alias pour les imports internes Drizzle
      '../../drizzle/src/db/schema': resolve(__dirname, 'drizzle/src/db/schema'),
    },
  },
});

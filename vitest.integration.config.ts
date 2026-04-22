/**
 * vitest.integration.config.ts
 * Config Vitest dédiée aux tests d'intégration RÉELS.
 * 
 * ⚠️ NE PAS INJECTER DE FAUSSES CLÉS — lit directement depuis .env
 * pour utiliser les vraies credentials Mailgun, AWS et CloudFront.
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30000,

    // Aucune env override — on laisse dotenv dans le test charger lui-même les vraies clés
    // (défini dans beforeAll via dotenv.config())

    reporters: ['verbose'],
  },

  resolve: {
    alias: {
      '#imports': resolve(__dirname, 'tests/__mocks__/nuxt-imports.ts'),
      '~': resolve(__dirname, 'app'),
      '~~': resolve(__dirname, '.'),
    },
  },
});

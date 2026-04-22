/**
 * tests/__mocks__/nuxt-imports.ts
 * Stub des auto-imports Nuxt (#imports) pour les tests Vitest
 * Évite les erreurs "Cannot resolve module '#imports'"
 */

import { vi } from 'vitest';

// useRuntimeConfig — sera souvent surchargé dans les tests individuels via vi.mock()
export const useRuntimeConfig = vi.fn(() => ({
  // AWS / CloudFront (valeurs de test)
  awsRegion: 'eu-west-1',
  awsS3BucketName: 'techkne-vitest-mock',
  awsAccessKeyId: 'VITEST_ACCESS_KEY',
  awsSecretAccessKey: 'VITEST_SECRET_KEY',
  cloudfrontDomain: 'assets.techkne.com',
  cloudfrontKeyPairId: 'K3VITEST00000',
  cloudfrontPrivateKey: '-----BEGIN RSA PRIVATE KEY-----\nMOCKED\n-----END RSA PRIVATE KEY-----',

  // Mailgun — domaine unique support.techkne.com pour les tests
  mailgunApiKey: 'VITEST_MOCK_KEY_DO_NOT_USE',
  mailDomainSystem: 'support.techkne.com',
  mailDomainMarketing: 'support.techkne.com',
  mailDomainSupport: 'support.techkne.com',
  smtpHost: 'smtp.mailgun.org',
  smtpPort: 587,
  smtpUser: 'postmaster@support.techkne.com',
  smtpPass: 'VITEST_MOCK_SMTP_PASS',

  // Cloudflare R2
  r2AccountId: 'vitest-r2-account',
  r2AccessKeyId: 'VITEST_R2_ACCESS',
  r2SecretAccessKey: 'VITEST_R2_SECRET',
  r2BucketName: 'techkne-vitest',
  r2PublicUrl: 'https://pub-vitest.r2.dev',

  // Public
  public: {
    authBaseUrl: 'http://localhost:3000',
  },
}));

// defineEventHandler — no-op pour les handlers H3
export const defineEventHandler = vi.fn((handler: any) => handler);

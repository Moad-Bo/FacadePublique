/**
 * email-router.test.ts
 * Tests unitaires pour server/utils/email-router.ts
 * 
 * ⚠️ NOTE: Pour les tests d'intégration réels contre Mailgun, 
 * on utilise UNIQUEMENT le domaine support.techkne.com (seul domaine actif)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock Drizzle ORM — aucune vraie requête DB
let mockAudienceResult: any = null;

vi.mock('../../server/utils/db', () => ({
  db: {
    query: {
      audience: {
        findFirst: vi.fn(async () => mockAudienceResult),
      },
    },
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col: any, val: any) => ({ col, val })),
}));

// Mock useRuntimeConfig
vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({
    // NOTE: Pour le moment, seul support.techkne.com est actif sur Mailgun
    // Les autres domaines sont prévus mais non alloués
    mailDomainSystem: 'support.techkne.com',  // Domaine unifié pour les tests
    mailDomainMarketing: 'support.techkne.com', // Pas encore actif — override pour test
    mailDomainSupport: 'support.techkne.com',
  })),
}));

// Mock schema Drizzle
vi.mock('../../drizzle/src/db/schema', () => ({
  audience: {},
}));

// ─── Import (après mocks) ─────────────────────────────────────────────────────
import { emailRouter, EmailContext } from '../../server/utils/email-router';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('emailRouter — Routeur Intelligent Emails', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockAudienceResult = null; // Reset audience mock
  });

  // ── TEST A : Contexte SYSTEM ──────────────────────────────────────────────
  describe('EmailContext.SYSTEM', () => {
    it('Test A1 — toujours autorisé, sans vérification audience', async () => {
      const result = await emailRouter.getRouting(EmailContext.SYSTEM, 'user@test.com');
      expect(result.allowed).toBe(true);
      expect(result.method).toBe('api');
    });

    it('Test A2 — utilise le domaine system (support.techkne.com)', async () => {
      const result = await emailRouter.getRouting(EmailContext.SYSTEM, 'user@test.com');
      expect(result.domain).toBe('support.techkne.com');
    });

    it('Test A3 — fonctionne même si l\'utilisateur n\'est pas dans la table audience', async () => {
      mockAudienceResult = null; // Utilisateur inconnu
      const result = await emailRouter.getRouting(EmailContext.SYSTEM, 'unknown@domain.com');
      expect(result.allowed).toBe(true);
    });
  });

  // ── TEST B : Contexte BLOG_BATCH ──────────────────────────────────────────
  describe('EmailContext.BLOG_BATCH', () => {
    it('Test B1 — bloqué si optInNewsletter est false', async () => {
      mockAudienceResult = { email: 'user@test.com', optInNewsletter: false, optInMarketing: false };
      
      const result = await emailRouter.getRouting(EmailContext.BLOG_BATCH, 'user@test.com');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('newsletter');
    });

    it('Test B2 — autorisé si optInNewsletter est true', async () => {
      mockAudienceResult = { email: 'user@test.com', optInNewsletter: true, optInMarketing: false };
      
      const result = await emailRouter.getRouting(EmailContext.BLOG_BATCH, 'user@test.com');
      expect(result.allowed).toBe(true);
      expect(result.method).toBe('api');
    });

    it('Test B3 — bloqué si utilisateur absent de la table audience', async () => {
      mockAudienceResult = null; // Utilisateur non enregistré
      
      const result = await emailRouter.getRouting(EmailContext.BLOG_BATCH, 'ghost@domain.com');
      expect(result.allowed).toBe(false);
    });
  });

  // ── TEST C : Contexte MARKETING_BATCH (Sécurité opt-in) ──────────────────
  describe('EmailContext.MARKETING_BATCH (Sécurité RGPD)', () => {
    it('Test C1 — CRITIQUE: bloqué si opt_in_marketing = false', async () => {
      mockAudienceResult = { 
        email: 'user@test.com', 
        optInMarketing: false, 
        optInNewsletter: false 
      };
      
      const result = await emailRouter.getRouting(EmailContext.MARKETING_BATCH, 'user@test.com');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('Test C2 — CRITIQUE: bloqué si aucun opt-in (RGPD)', async () => {
      mockAudienceResult = null; // Jamais opt-in
      
      const result = await emailRouter.getRouting(EmailContext.MARKETING_BATCH, 'random@person.com');
      expect(result.allowed).toBe(false);
    });

    it('Test C3 — autorisé si optInMarketing est true', async () => {
      mockAudienceResult = { 
        email: 'user@test.com', 
        optInMarketing: true, 
        optInNewsletter: false 
      };
      
      const result = await emailRouter.getRouting(EmailContext.MARKETING_BATCH, 'user@test.com');
      expect(result.allowed).toBe(true);
    });

    it('Test C4 — autorisé si optInNewsletter est true (équivalence marketing)', async () => {
      mockAudienceResult = { 
        email: 'user@test.com', 
        optInMarketing: false, 
        optInNewsletter: true  // Newsletter = acceptence implicite du marketing
      };
      
      const result = await emailRouter.getRouting(EmailContext.MARKETING_BATCH, 'user@test.com');
      expect(result.allowed).toBe(true);
    });
  });

  // ── TEST D : Contexte WEBMAILER (Support BPO) ────────────────────────────
  describe('EmailContext.WEBMAILER', () => {
    it('Test D1 — utilise la méthode SMTP (streaming)', async () => {
      const result = await emailRouter.getRouting(EmailContext.WEBMAILER, 'client@example.com');
      expect(result.method).toBe('smtp');
    });

    it('Test D2 — toujours autorisé (pas de check opt-in pour le support)', async () => {
      const result = await emailRouter.getRouting(EmailContext.WEBMAILER, 'client@example.com');
      expect(result.allowed).toBe(true);
    });

    it('Test D3 — utilise le domaine support (support.techkne.com)', async () => {
      const result = await emailRouter.getRouting(EmailContext.WEBMAILER, 'client@example.com');
      expect(result.domain).toBe('support.techkne.com');
    });
  });

  // ── TEST E : Contexte FORUM_TX / BLOG_TX ─────────────────────────────────
  describe('EmailContext.FORUM_TX', () => {
    it('Test E1 — bloqué si l\'utilisateur a opt-out forum', async () => {
      mockAudienceResult = { email: 'user@test.com', optInForum: false };
      
      const result = await emailRouter.getRouting(EmailContext.FORUM_TX, 'user@test.com');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('forum');
    });

    it('Test E2 — autorisé si utilisateur non trouvé en DB (comportement permissif)', async () => {
      mockAudienceResult = null;
      
      const result = await emailRouter.getRouting(EmailContext.FORUM_TX, 'newuser@test.com');
      // Le routeur actuel autorise si audience pas trouvée
      expect(result.allowed).toBe(true);
    });
  });

  // ── TEST F : EmailContext Enum — vérification des valeurs ────────────────
  describe('EmailContext Enum (Contrat de TypeScript)', () => {
    it('Test F1 — toutes les valeurs de l\'enum sont définies', () => {
      expect(EmailContext.SYSTEM).toBe('system');
      expect(EmailContext.FORUM_TX).toBe('forum_tx');
      expect(EmailContext.BLOG_TX).toBe('blog_tx');
      expect(EmailContext.MARKETING_BATCH).toBe('marketing_batch');
      expect(EmailContext.BLOG_BATCH).toBe('blog_batch');
      expect(EmailContext.WEBMAILER).toBe('webmailer');
    });
  });
});

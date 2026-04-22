/**
 * email-builder.test.ts
 * Tests unitaires pour server/utils/email-builder.ts
 * Teste : sanitization HTML, tokens de désinscription, wrapping de layout
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock Drizzle DB — retourne un layout de test par défaut
let mockLayoutResult: any = null;

vi.mock('../../server/utils/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve(mockLayoutResult ? [mockLayoutResult] : [])),
      })),
    })),
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

vi.mock('../../drizzle/src/db/schema', () => ({
  emailLayout: {},
}));

// Mock des variables d'environnement
vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-key-2026');
vi.stubEnv('BETTER_AUTH_URL', 'http://localhost:3000');

// Mock sanitize-html pour isoler la logique (on teste son appel, pas son implem)
vi.mock('sanitize-html', () => ({
  default: vi.fn((html: string) => html), // Pass-through en test
}));

// ─── Import ───────────────────────────────────────────────────────────────────
import {
  sanitizeEmailHtml,
  generateUnsubscribeToken,
  wrapEmailContent,
} from '../../server/utils/email-builder';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('email-builder — Constructeur de Layouts Email', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockLayoutResult = null;
  });

  // ── TEST A : generateUnsubscribeToken ─────────────────────────────────────
  describe('generateUnsubscribeToken()', () => {
    it('Test A1 — génère un token de 16 chars hexadécimaux', () => {
      const token = generateUnsubscribeToken('user@techkne.com');
      expect(token).toHaveLength(16);
      expect(token).toMatch(/^[a-f0-9]{16}$/);
    });

    it('Test A2 — la même adresse produit toujours le même token (déterministe)', () => {
      const t1 = generateUnsubscribeToken('same@email.com');
      const t2 = generateUnsubscribeToken('same@email.com');
      expect(t1).toBe(t2);
    });

    it('Test A3 — deux adresses différentes produisent des tokens différents', () => {
      const t1 = generateUnsubscribeToken('alice@techkne.com');
      const t2 = generateUnsubscribeToken('bob@techkne.com');
      expect(t1).not.toBe(t2);
    });
  });

  // ── TEST B : sanitizeEmailHtml ────────────────────────────────────────────
  describe('sanitizeEmailHtml()', () => {
    it('Test B1 — ne plante pas avec une chaîne HTML valide', () => {
      expect(() => sanitizeEmailHtml('<p>Hello <strong>World</strong></p>')).not.toThrow();
    });

    it('Test B2 — ne plante pas avec une chaîne vide', () => {
      const result = sanitizeEmailHtml('');
      expect(result).toBeDefined();
    });
  });

  // ── TEST C : wrapEmailContent ─────────────────────────────────────────────
  describe('wrapEmailContent()', () => {
    it('Test C1 — utilise le layout par défaut si aucun layout en DB', async () => {
      mockLayoutResult = null; // Pas de layout en DB
      
      const result = await wrapEmailContent('<p>Mon contenu</p>', {
        recipient: 'user@test.com',
        subject: 'Test Subject',
        type: 'system',
      });
      
      // Le layout par défaut doit contenir les marqueurs CSS Techknè
      expect(result).toContain('TECHKNÈ');
      expect(result).toContain('Mon contenu');
    });

    it('Test C2 — utilise le layout de la DB si disponible', async () => {
      mockLayoutResult = {
        id: 'system',
        html: '<html><body>{{{body}}}</body></html>',
      };
      
      const result = await wrapEmailContent('<p>Contenu injecté</p>', {
        recipient: 'user@test.com',
        subject: 'Test',
        type: 'system',
      });
      
      expect(result).toContain('Contenu injecté');
    });

    it('Test C3 — injecte le pixel de tracking si logId est fourni', async () => {
      const result = await wrapEmailContent('<p>Track me</p>', {
        recipient: 'user@test.com',
        subject: 'Tracked',
        type: 'newsletter',
        logId: 'uuid-test-1234',
      });
      
      expect(result).toContain('/api/mails/track?id=uuid-test-1234');
    });

    it('Test C4 — injecte le campaignId dans le pixel de tracking si fourni', async () => {
      const result = await wrapEmailContent('<p>Campaign</p>', {
        recipient: 'user@test.com',
        subject: 'Newsletter',
        type: 'newsletter',
        logId: 'log-abc',
        campaignId: 'campaign-xyz',
      });
      
      expect(result).toContain('cid=campaign-xyz');
    });

    it('Test C5 — remplace le token {user} par le userName', async () => {
      mockLayoutResult = {
        id: 'system',
        html: '<html><body>Bonjour {user}, {{{body}}}</body></html>',
      };
      
      const result = await wrapEmailContent('<p>Bienvenue</p>', {
        recipient: 'user@test.com',
        subject: 'Test',
        type: 'system',
        userName: 'Mohammed',
      });
      
      expect(result).toContain('Bonjour Mohammed');
    });

    it('Test C6 — contient un lien de désabonnement pour les newsletters', async () => {
      const result = await wrapEmailContent('<p>Offre du mois</p>', {
        recipient: 'subscriber@test.com',
        subject: 'Newsletter Avril',
        type: 'newsletter',
      });
      
      // Le layout par défaut inclut le lien de désabo pour les newsletters
      expect(result).toContain('/api/newsletter/unsubscribe');
      expect(result).toContain('subscriber%40test.com');
    });
  });
});

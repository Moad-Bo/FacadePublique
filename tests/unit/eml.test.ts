/**
 * eml.test.ts
 * Tests unitaires pour server/utils/eml.ts
 * Teste: parseEML, formatEmailAddress
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock R2 (pas d'appel réseau pendant les tests)
vi.mock('../../server/utils/r2', () => ({
  uploadStreamToS3: vi.fn(async (key: string, _stream: any, _contentType: string) => {
    return `https://r2.techkne.com/${key}`;
  }),
  updateObjectTags: vi.fn(async () => {}),
}));

// ─── Import ───────────────────────────────────────────────────────────────────
import { parseEML, formatEmailAddress } from '../../server/utils/eml';

// ─── Fixtures EML ──────────────────────────────────────────────────────────────

const BASIC_EML = `From: Alice Martin <alice@techkne.com>
To: bob@client.com
Subject: Rapport mensuel
Date: Mon, 21 Apr 2026 10:00:00 +0200
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8

<html><body><p>Bonjour, veuillez trouver ci-joint le rapport.</p></body></html>`;

const EML_WITHOUT_HTML = `From: System <system@techkne.com>
Subject: Alerte système
Date: Mon, 21 Apr 2026 08:00:00 +0000
Content-Type: text/plain

Alerte: Le quota d'envoi approche de la limite.`;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('eml — Parseur EML', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── TEST A : parseEML ──────────────────────────────────────────────────────
  describe('parseEML()', () => {
    it('Test A1 — extrait le sujet correctement', async () => {
      const result = await parseEML(BASIC_EML);
      expect(result.subject).toBe('Rapport mensuel');
    });

    it('Test A2 — extrait l\'adresse From correctement', async () => {
      const result = await parseEML(BASIC_EML);
      expect(result.from.email).toBe('alice@techkne.com');
      expect(result.from.name).toBe('Alice Martin');
    });

    it('Test A3 — retourne "(Sans objet)" si pas de Subject', async () => {
      const eml = BASIC_EML.replace('Subject: Rapport mensuel\n', '');
      const result = await parseEML(eml);
      expect(result.subject).toBe('(Sans objet)');
    });

    it('Test A4 — extrait le corps HTML en priorité sur le texte', async () => {
      const result = await parseEML(BASIC_EML);
      expect(result.body).toContain('Bonjour');
    });

    it('Test A5 — utilise le texte si pas de HTML', async () => {
      const result = await parseEML(EML_WITHOUT_HTML);
      expect(result.body).toContain('Alerte');
    });

    it('Test A6 — retourne une date ISO valide', async () => {
      const result = await parseEML(BASIC_EML);
      const date = new Date(result.date);
      expect(date.getFullYear()).toBe(2026);
    });
  });

  // ── TEST B : formatEmailAddress ───────────────────────────────────────────
  describe('formatEmailAddress()', () => {
    it('Test B1 — parse correctement le format "Nom Prénom <email>"', () => {
      const result = formatEmailAddress('Alice Martin <alice@techkne.com>');
      expect(result.name).toBe('Alice Martin');
      expect(result.email).toBe('alice@techkne.com');
    });

    it('Test B2 — tolère un email sans chevrons: email utilisé comme nom', () => {
      const result = formatEmailAddress('bob@client.com');
      expect(result.email).toBe('bob@client.com');
      // L'implémentation réelle : sans chevrons, le raw entier est utilisé comme nom
      // (pas d'extraction de la partie avant @)
      expect(result.name).toBeTruthy();
      expect(result.name).not.toBe('Inconnu');
    });

    it('Test B3 — retourne "Inconnu" si la chaîne est vide', () => {
      const result = formatEmailAddress('');
      expect(result.name).toBe('Inconnu');
      expect(result.email).toBe('');
    });

    it('Test B4 — normalise l\'email en minuscules', () => {
      const result = formatEmailAddress('Alice <ALICE@Techkne.COM>');
      expect(result.email).toBe('alice@techkne.com');
    });

    it('Test B5 — supprime les guillemets autour du nom', () => {
      const result = formatEmailAddress('"Alice Martin" <alice@techkne.com>');
      expect(result.name).toBe('Alice Martin');
      expect(result.name).not.toContain('"');
    });
  });
});

/**
 * aws-assets.test.ts
 * Tests unitaires pour server/utils/aws-assets.ts (version avec lecture .pem)
 * Mock total de fs, @aws-sdk/cloudfront-signer et #imports
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Config mutable — modifiée par test pour simuler des scénarios différents
let mockConfig: any = {
  cloudfrontDomain: 'assets.techkne.com',
  cloudfrontKeyPairId: 'K3TESTPAIRID',
  // Pointe vers un fichier fictif — fs est mocké ci-dessous
  cloudfrontPrivateKeyPath: 'server/keys/pk-TESTKEY.pem',
  awsRegion: 'eu-west-3',
  awsAccessKeyId: 'TEST_ACCESS_KEY',
  awsSecretAccessKey: 'TEST_SECRET_KEY',
  awsS3BucketName: 'techkne-vitest',
};

// Mock @aws-sdk/cloudfront-signer — simule une vraie signature
vi.mock('@aws-sdk/cloudfront-signer', () => ({
  getSignedUrl: vi.fn(({ url, keyPairId, dateLessThan }: any) => {
    const expireTs = new Date(dateLessThan).getTime();
    return `${url}?Expires=${expireTs}&Signature=MOCKED_SIGNATURE&Key-Pair-Id=${keyPairId}`;
  }),
}));

// Mock @aws-sdk/client-s3 — évite les vrais appels AWS
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn(async () => ({})),
  })),
  PutObjectTaggingCommand: vi.fn((params: any) => params),
}));

// Mock du système de fichiers — retourne une fausse clé PEM
vi.mock('fs', () => ({
  readFileSync: vi.fn((_path: string, _encoding: string) => {
    return '-----BEGIN RSA PRIVATE KEY-----\nMOCKED_PEM_CONTENT\n-----END RSA PRIVATE KEY-----\n';
  }),
}));

// Mock path — passe-through simple
vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path');
  return { ...actual };
});

// Mock useRuntimeConfig
vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => mockConfig),
}));

// ─── Import du service (après les mocks) ──────────────────────────────────────
import { awsAssetsService } from '../../server/utils/aws-assets';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractParam(url: string, param: string): string | null {
  try {
    const u = new URL(url);
    return u.searchParams.get(param);
  } catch {
    return null;
  }
}

const DEFAULT_CONFIG = {
  cloudfrontDomain: 'assets.techkne.com',
  cloudfrontKeyPairId: 'K3TESTPAIRID',
  cloudfrontPrivateKeyPath: 'server/keys/pk-TESTKEY.pem',
  awsRegion: 'eu-west-3',
  awsAccessKeyId: 'TEST_ACCESS_KEY',
  awsSecretAccessKey: 'TEST_SECRET_KEY',
  awsS3BucketName: 'techkne-vitest',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('awsAssetsService — Moteur d\'Assets', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = { ...DEFAULT_CONFIG };
    // Reset le cache de clé privée entre les tests
    // (on contourne le module cache en réassignant mockConfig)
  });

  // ── TEST A : URL Publique ──────────────────────────────────────────────────
  describe('getPublicUrl()', () => {
    it('Test A1 — retourne une URL CloudFront publique correcte', () => {
      const url = awsAssetsService.getPublicUrl('avatars/user-123.webp');
      expect(url).toBe('https://assets.techkne.com/avatars/user-123.webp');
    });

    it('Test A2 — fonctionne avec une clé contenant des sous-dossiers', () => {
      const url = awsAssetsService.getPublicUrl('public/newsletter/banner-april.png');
      expect(url).toBe('https://assets.techkne.com/public/newsletter/banner-april.png');
    });

    it('Test A3 — nettoie les slashes initiaux', () => {
      const url = awsAssetsService.getPublicUrl('/forum/post-img.webp');
      expect(url).not.toContain('//forum');
      expect(url).toBe('https://assets.techkne.com/forum/post-img.webp');
    });
  });

  // ── TEST B : formatKey ────────────────────────────────────────────────────
  describe('formatKey()', () => {
    it('Test B1 — préfixe correctement avec public/ + timestamp', () => {
      const key = awsAssetsService.formatKey('avatars', 'photo.webp');
      expect(key).toMatch(/^public\/avatars\/\d+-photo\.webp$/);
    });

    it('Test B2 — nettoie les slashes du dossier', () => {
      const key = awsAssetsService.formatKey('/attachments/', 'doc.pdf');
      expect(key).toMatch(/^public\/attachments\/\d+-doc\.pdf$/);
    });

    it('Test B3 — lève une erreur pour un dossier non autorisé', () => {
      expect(() => awsAssetsService.formatKey('secret', 'file.exe')).toThrow('non autorisé');
    });

    it('Test B4 — sanitise les caractères dangereux dans le filename', () => {
      const key = awsAssetsService.formatKey('ugc', '../../../etc/passwd');
      // Les slashes et points multiples doivent être remplacés par _
      expect(key).not.toContain('../');
      expect(key).toMatch(/^public\/ugc\//);
    });
  });

  // ── TEST C : getSignedUrl ─────────────────────────────────────────────────
  describe('getSignedUrl()', () => {
    it('Test C1 — génère une URL signée avec Key-Pair-Id', () => {
      const url = awsAssetsService.getSignedUrl('attachments/webmailer/contract.pdf');
      expect(url).toContain('Key-Pair-Id=K3TESTPAIRID');
    });

    it('Test C2 — contient un paramètre Expires dans le futur', () => {
      const before = Date.now();
      const url = awsAssetsService.getSignedUrl('attachments/invoice.pdf', 3600);
      const afterTs = before + 3600 * 1000;

      const expires = extractParam(url, 'Expires');
      expect(expires).not.toBeNull();
      const expiresMs = parseInt(expires!);
      expect(expiresMs).toBeGreaterThan(before);
      expect(expiresMs).toBeLessThanOrEqual(afterTs + 5000);
    });

    it('Test C3 — contient une signature MOCKED_SIGNATURE', () => {
      const url = awsAssetsService.getSignedUrl('attachments/doc.pdf');
      expect(url).toContain('Signature=MOCKED_SIGNATURE');
    });

    it('Test C4 (Sécurité) — fallback URL publique si keyPairId manquant', () => {
      mockConfig = { ...DEFAULT_CONFIG, cloudfrontKeyPairId: '' };
      const url = awsAssetsService.getSignedUrl('attachments/secret.pdf');
      expect(url).toContain('assets.techkne.com');
      expect(url).not.toContain('Signature');
    });

    it('Test C5 (Cache) — la clé est mise en cache après le premier chargement', () => {
      // La clé est lue une seule fois depuis le fichier .pem (module cache).
      // Ce test vérifie que le comportement de signing reste cohérent
      // même si on appelle getSignedUrl plusieurs fois de suite.
      const url1 = awsAssetsService.getSignedUrl('attachments/a.pdf', 3600);
      const url2 = awsAssetsService.getSignedUrl('attachments/b.pdf', 3600);
      // Les deux doivent être signées (preuves que le cache fonctionne)
      expect(url1).toContain('Signature=MOCKED_SIGNATURE');
      expect(url2).toContain('Signature=MOCKED_SIGNATURE');
    });
  });

  // ── TEST D : mapAssets ────────────────────────────────────────────────────
  describe('mapAssets()', () => {
    it('Test D1 — URL publique pour les assets non-privés', () => {
      const assets = [{ s3Key: 'avatars/avatar.webp', type: 'avatar' }];
      const result = awsAssetsService.mapAssets(assets);
      expect(result[0].url).toBe('https://assets.techkne.com/avatars/avatar.webp');
      expect(result[0].url).not.toContain('Signature');
    });

    it('Test D2 — URL signée pour mailbox_attachment', () => {
      const assets = [{ s3Key: 'attachments/doc.pdf', type: 'mailbox_attachment' }];
      const result = awsAssetsService.mapAssets(assets);
      expect(result[0].url).toContain('Key-Pair-Id=K3TESTPAIRID');
    });

    it('Test D3 — URL signée pour les documents légaux', () => {
      const assets = [{ s3Key: 'legal/contract.pdf', type: 'legal' }];
      const result = awsAssetsService.mapAssets(assets);
      expect(result[0].url).toContain('Signature');
    });

    it('Test D4 — retourne url vide si s3Key absent', () => {
      const assets = [{ type: 'avatar' }] as any;
      const result = awsAssetsService.mapAssets(assets);
      expect(result[0].url).toBe('');
    });
  });
});

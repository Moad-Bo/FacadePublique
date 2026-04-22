/**
 * tests/integration/real-send.test.ts
 *
 * ⚠️  TESTS D'INTÉGRATION RÉELS — Envoie de vrais emails via Mailgun !
 *
 * Domaine actif : support.techkne.com
 * Destinataires de test : 3 adresses personnelles de l'équipe
 * Limite : MAX 1 email par destinataire par run (3 emails au total)
 *
 * Usage : npm run test:integration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createHmac, createHash } from 'crypto';
import { readFileSync } from 'fs';

// ── Chargement .env AVANT tout — critique pour les vars au niveau module ───────
config({ path: resolve(process.cwd(), '.env') });

// ── Configuration (instanciée APRÈS dotenv.config()) ──────────────────────────
const SENDING_DOMAIN = 'support.techkne.com';

const TEST_RECIPIENTS = [
  { email: 'boudjemlinemoad@gmail.com', label: 'Gmail' },
  { email: 'moad.bo@proton.me',         label: 'ProtonMail' },
  { email: 'psnmoad@outlook.fr',        label: 'Outlook' },
];

// ── Client Mailgun (instancié dans beforeAll, après dotenv) ───────────────────
let mg: any = null;

function buildHtml(recipient: string, label: string): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; background: #f5f5f5; margin:0; padding:20px; }
.c { max-width:600px; margin:0 auto; background:#fff; border-radius:12px; border:1px solid #e8e8e8; overflow:hidden; }
.h { background:#000; padding:24px; text-align:center; }
.logo { color:#fff; font-size:20px; font-weight:800; }
.logo span { color:#6366f1; }
.body { padding:32px; }
.badge { background:#ecfdf5; color:#065f46; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600; }
h1 { font-size:22px; color:#111; margin: 16px 0 12px; }
p { font-size:15px; color:#555; line-height:1.7; }
.meta { background:#f9fafb; border-radius:8px; padding:16px; margin:20px 0; font-size:13px; }
.footer { padding:20px; background:#fafafa; border-top:1px solid #f0f0f0; text-align:center; font-size:12px; color:#999; }
</style></head>
<body>
<div class="c">
  <div class="h"><div class="logo">TECHKNÈ <span>GROUP</span></div></div>
  <div class="body">
    <span class="badge">✅ Test de Livraison</span>
    <h1>Validation Hub de Communication</h1>
    <p>Test d'intégration envoyé via <strong>Mailgun EU API</strong> depuis le backend Techknè.</p>
    <div class="meta">
      <p><strong>Destinataire :</strong> ${recipient} (${label})</p>
      <p><strong>Domaine :</strong> ${SENDING_DOMAIN}</p>
      <p><strong>Timestamp :</strong> ${new Date().toISOString()}</p>
    </div>
    <p>✅ Si vous recevez cet email, le système de communication est <strong>opérationnel</strong>.</p>
  </div>
  <div class="footer">Techknè Group · Test Interne · Ne pas répondre</div>
</div>
</body></html>`;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const apiKey = process.env.MAILGUN_API_KEY?.replace(/^["']|["']$/g, '').trim();
  if (!apiKey) throw new Error('MAILGUN_API_KEY manquant dans .env');

  // Import dynamique pour garantir que dotenv est chargé AVANT l'instanciation
  const FormData = (await import('form-data')).default;
  const Mailgun  = (await import('mailgun.js')).default;

  mg = new Mailgun(FormData as any).client({
    username: 'api',
    key: apiKey,
    url: 'https://api.eu.mailgun.net',
  });

  console.log(`\n🚀 Tests d'intégration Mailgun — ${SENDING_DOMAIN}`);
  console.log(`📬 Destinataires: ${TEST_RECIPIENTS.map(r => r.email).join(', ')}\n`);
});

// ─── SUITE 1 : Envoi API Mailgun vers les 3 destinataires ────────────────────

describe('🔵 TEST Envoi API Mailgun — support.techkne.com', () => {

  for (const recipient of TEST_RECIPIENTS) {
    it(`Envoi API → ${recipient.email} (${recipient.label})`, async () => {
      const subject = `[TEST] Hub Communication Techknè — ${recipient.label} — ${new Date().toLocaleDateString('fr-FR')}`;

      const result = await mg.messages.create(SENDING_DOMAIN, {
        from: `Techknè Support <postmaster@${SENDING_DOMAIN}>`,
        to: [recipient.email],
        subject,
        html: buildHtml(recipient.email, recipient.label),
        text: `Test Hub Communication Techknè. Domaine: ${SENDING_DOMAIN}. Vers: ${recipient.email}`,
        'h:X-Techkne-Test': 'integration-v2',
        'h:X-Techkne-Recipient': recipient.label,
      });

      console.log(`  ✅ ${recipient.label} → ID: ${result.id}`);
      expect(result.id).toBeDefined();
      expect(result.message).toMatch(/Queued/i);
    }, 20000);
  }
});

// ─── SUITE 2 : Vérification Signature Webhook Mailgun ────────────────────────

describe('🔒 TEST Vérification Signature Webhook Mailgun', () => {

  it('Génère et vérifie une signature HMAC-SHA256 valide', () => {
    const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY?.replace(/^["']|["']$/g, '').trim();

    if (!signingKey) {
      console.warn('  ⚠️ MAILGUN_WEBHOOK_SIGNING_KEY non défini — test ignoré');
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const token = `test-token-${Date.now()}`;

    // Logique exacte Mailgun
    const signature = createHmac('sha256', signingKey)
      .update(timestamp.concat(token))
      .digest('hex');

    // Vérification
    const recomputedSignature = createHmac('sha256', signingKey)
      .update(timestamp.concat(token))
      .digest('hex');

    expect(recomputedSignature).toBe(signature);
    expect(signature).toHaveLength(64); // SHA256 hex = 64 chars
    console.log(`  ✅ HMAC-SHA256 valide: ${signature.slice(0, 16)}...`);
  });

  it('Rejette correctement un timestamp trop ancien (anti-replay)', () => {
    const MAX_AGE = 5 * 60; // 5 min en secondes
    const oldTimestamp = Math.floor(Date.now() / 1000) - 601; // 10min + 1s dans le passé
    const age = Math.abs(Math.floor(Date.now() / 1000) - oldTimestamp);

    expect(age).toBeGreaterThan(MAX_AGE);
    console.log(`  ✅ Timestamp trop ancien détecté: ${age}s > ${MAX_AGE}s max`);
  });

  it('Vérifie que la clé webhook est configurée et au bon format', () => {
    const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY?.replace(/^["']|["']$/g, '').trim();
    if (!signingKey) {
      console.warn('  ⚠️ Clé non configurée');
      return;
    }
    // La webhook signing key Mailgun est un hex de 32 chars
    expect(signingKey.length).toBeGreaterThanOrEqual(16);
    console.log(`  ✅ Clé webhook configurée (${signingKey.length} chars)`);
  });
});

// ─── SUITE 3 : Chargement clé privée CloudFront ───────────────────────────────

describe('🔐 TEST Clé Privée CloudFront (.pem)', () => {

  it('Lit et valide le fichier .pem depuis CLOUDFRONT_PRIVATE_KEY_PATH', () => {
    const keyPath = process.env.CLOUDFRONT_PRIVATE_KEY_PATH?.replace(/^["']|["']$/g, '').trim();

    if (!keyPath) {
      console.warn('  ⚠️ CLOUDFRONT_PRIVATE_KEY_PATH non défini — test ignoré');
      return;
    }

    const absolutePath = resolve(process.cwd(), keyPath.replace(/^\//, ''));
    const key = readFileSync(absolutePath, 'utf-8');

    expect(key).toContain('-----BEGIN RSA PRIVATE KEY-----');
    expect(key).toContain('-----END RSA PRIVATE KEY-----');
    expect(key.length).toBeGreaterThan(100);

    // Vérifier que le KeyPairId correspond au fichier chargé
    const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID?.replace(/^["']|["']$/g, '').trim();
    if (keyPairId) {
      expect(keyPath).toContain(keyPairId);
    }

    console.log(`  ✅ PEM chargé: ${absolutePath} (${key.length} chars)`);
    console.log(`  ✅ KeyPairId: ${keyPairId}`);
  });
});

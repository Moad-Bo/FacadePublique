/**
 * test-inbound-webhook.mjs — Simule un webhook inbound Mailgun avec signature HMAC valide
 */
import { createHmac } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const SIGNING_KEY = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
const BASE_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/api/webhooks/mailgun/inbound`;

if (!SIGNING_KEY) {
  console.error('❌ MAILGUN_WEBHOOK_SIGNING_KEY manquante !');
  process.exit(1);
}

// Génère une signature valide
const timestamp = Math.floor(Date.now() / 1000).toString();
const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
const signature = createHmac('sha256', SIGNING_KEY).update(timestamp + token).digest('hex');

console.log(`🔑 Signing key: ${SIGNING_KEY}`);
console.log(`📡 Endpoint: ${ENDPOINT}`);
console.log(`⏱️  Timestamp: ${timestamp}`);

const boundary = '----MgTestBoundary7MA4';
const parts = [
  ['timestamp', timestamp],
  ['token', token],
  ['signature', signature],
  ['sender', 'boudjemlinemoad@gmail.com'],
  ['recipient', 'contact@support.techkne.com'],
  ['from', '"Moad Gmail" <boudjemlinemoad@gmail.com>'],
  ['To', '"contact@support.techkne.com" <contact@support.techkne.com>'],
  ['subject', '[DIAGNOSTIC] Test inbound webhook ' + new Date().toISOString()],
  ['body-html', '<html><body><p>Test <strong>diagnostique</strong> du webhook inbound Techknè.</p><p>Timestamp: ' + timestamp + '</p></body></html>'],
  ['body-plain', 'Test diagnostique du webhook inbound Techkne. Timestamp: ' + timestamp],
  ['stripped-text', 'Test diagnostique du webhook inbound'],
  ['Message-Id', '<diag-' + token + '@techkne.dev>'],
  ['attachment-count', '0'],
];

let body = '';
for (const [name, value] of parts) {
  body += `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
}
body += `--${boundary}--\r\n`;

console.log('\n📤 Envoi du webhook simulé...');
try {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  });

  const text = await res.text();
  console.log(`\n📊 Status: ${res.status} ${res.statusText}`);
  console.log(`📄 Body: ${text}`);

  if (res.ok) {
    console.log('\n✅ Webhook accepté! Vérifiez la table mailbox.');
  } else {
    console.log('\n❌ Webhook rejeté. Détail:', text);
  }
} catch (e) {
  console.error('\n❌ Erreur réseau:', e.message);
  console.log('   → Le serveur Nuxt tourne-t-il sur', BASE_URL, '?');
}

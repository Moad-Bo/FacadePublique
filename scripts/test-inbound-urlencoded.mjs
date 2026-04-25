/**
 * test-inbound-urlencoded.mjs
 * Simule exactement ce que Mailgun envoie en mode "store+notify" :
 * Content-Type: application/x-www-form-urlencoded
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

const timestamp = Math.floor(Date.now() / 1000).toString();
const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
const signature = createHmac('sha256', SIGNING_KEY).update(timestamp + token).digest('hex');

console.log(`📡 Endpoint: ${ENDPOINT}`);
console.log(`🔑 Signing key: ${SIGNING_KEY}`);
console.log(`⏱️  Timestamp: ${timestamp}`);
console.log(`✍️  Signature: ${signature.substring(0, 16)}...`);

// Construit le corps en x-www-form-urlencoded exactement comme Mailgun
const params = new URLSearchParams({
  timestamp,
  token,
  signature,
  sender: 'boudjemlinemoad@gmail.com',
  recipient: 'contact@support.techkne.com',
  from: 'Moad Gmail <boudjemlinemoad@gmail.com>',
  From: 'Moad Gmail <boudjemlinemoad@gmail.com>',
  To: 'contact@support.techkne.com',
  subject: `[TEST URL-ENCODED] Webhook ${new Date().toISOString()}`,
  'body-html': '<div dir="ltr"><p>Test inbound via x-www-form-urlencoded</p></div>',
  'body-plain': 'Test inbound via x-www-form-urlencoded',
  'stripped-text': 'Test inbound via x-www-form-urlencoded',
  'stripped-html': '<p>Test inbound via x-www-form-urlencoded</p>',
  'Message-Id': `<test-urlencode-${token}@techkne.dev>`,
  domain: 'support.techkne.com',
});

console.log('\n📤 Envoi en application/x-www-form-urlencoded...');

try {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const text = await res.text();
  console.log(`\n📊 Status: ${res.status} ${res.statusText}`);
  console.log(`📄 Body: ${text.substring(0, 200)}`);

  if (res.ok && text.includes('"success":true')) {
    console.log('\n✅ SUCCESS — Mail devrait être en BDD !');
    console.log('   → Vérifier: node scripts/check-mailbox.mjs');
  } else if (res.status === 401) {
    console.log('\n❌ HMAC invalide (401) — Vérifier MAILGUN_WEBHOOK_SIGNING_KEY');
  } else if (text.includes('<!DOCTYPE')) {
    console.log('\n❌ ERREUR : Le serveur a répondu avec la page HTML (route non trouvée)');
    console.log('   → Le fichier inbound.post.ts n\'est peut-être pas encore compilé (redémarrer nuxt dev)');
  } else {
    console.log('\n⚠️ Réponse inattendue');
  }
} catch (e) {
  console.error('\n❌ Erreur réseau:', e.message);
}

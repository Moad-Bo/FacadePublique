import { createHmac } from 'crypto';
import { useRuntimeConfig } from '#imports';

/**
 * Durée maximale acceptable d'un webhook Mailgun (en secondes).
 * Au-delà, on rejette la requête pour éviter les attaques par rejeu (replay attacks).
 */
const MAX_WEBHOOK_AGE_SECONDS = 5 * 60; // 5 minutes

export interface MailgunSignaturePayload {
  timestamp: string;
  token: string;
  signature: string;
}

/**
 * Vérifie l'authenticité d'un webhook Mailgun via HMAC-SHA256.
 *
 * Logique exacte Mailgun :
 *   HMAC-SHA256(signingKey, timestamp + token) === signature
 *
 * @param payload - Les 3 champs de signature extraits du body Mailgun
 * @returns { valid: boolean, reason?: string }
 */
export function verifyMailgunSignature(payload: MailgunSignaturePayload): {
  valid: boolean;
  reason?: string;
} {
  const { timestamp, token, signature } = payload;

  // 1. Valider que les champs existent
  if (!timestamp || !token || !signature) {
    return { valid: false, reason: 'Signature payload incomplet (timestamp/token/signature manquant)' };
  }

  // 2. Vérification de fraîcheur (anti-replay attack)
  const webhookTime = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000); // timestamp UNIX en secondes

  if (isNaN(webhookTime)) {
    return { valid: false, reason: 'Timestamp invalide (non numérique)' };
  }

  const ageInSeconds = Math.abs(now - webhookTime);
  if (ageInSeconds > MAX_WEBHOOK_AGE_SECONDS) {
    return {
      valid: false,
      reason: `Webhook trop ancien ou futur (âge: ${ageInSeconds}s, max: ${MAX_WEBHOOK_AGE_SECONDS}s) — possible replay attack`,
    };
  }

  // 3. Récupération de la clé de signature Mailgun
  const config = useRuntimeConfig();
  const signingKey = config.mailgunWebhookSigningKey as string | undefined;

  if (!signingKey) {
    console.error('[MAILGUN_VERIFY] MAILGUN_WEBHOOK_SIGNING_KEY non configuré. Webhook rejeté par sécurité.');
    return { valid: false, reason: 'Clé de signature Mailgun non configurée côté serveur' };
  }

  // 4. Calcul du token attendu (logique exacte de la doc Mailgun)
  const encodedToken = createHmac('sha256', signingKey)
    .update(timestamp.concat(token))
    .digest('hex');


  // 5. Comparaison à temps constant via double-HMAC (évite les timing attacks)
  // On signe la signature reçue avec la même clé pour comparer deux HMAC
  // de longueur identique (technique standard quand timingSafeEqual n'est pas dispo directement)
  const expectedHmac = createHmac('sha256', signingKey)
    .update(timestamp.concat(token))
    .digest('hex');

  // Comparaison caractère par caractère à longueur constante (anti-timing)
  let mismatch = 0;
  const a = expectedHmac;
  const b = signature.toLowerCase();
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }

  if (mismatch !== 0) {
    return { valid: false, reason: 'Signature HMAC invalide — webhook non authentifié' };
  }

  return { valid: true };

}

/**
 * Extrait les champs de signature depuis le body d'un webhook Mailgun.
 * Mailgun envoie la signature dans body.signature (pour les webhooks v3)
 * ou directement à la racine du body (pour les webhooks legacy).
 */
export function extractMailgunSignature(body: any): MailgunSignaturePayload | null {
  // Format v3 (webhooks configurés via l'UI Mailgun)
  if (body?.signature?.timestamp && body?.signature?.token && body?.signature?.signature) {
    return {
      timestamp: body.signature.timestamp,
      token: body.signature.token,
      signature: body.signature.signature,
    };
  }

  // Format legacy (anciens webhooks)
  if (body?.timestamp && body?.token && body?.signature) {
    return {
      timestamp: body.timestamp,
      token: body.token,
      signature: body.signature,
    };
  }

  return null;
}

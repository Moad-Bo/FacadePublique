/**
 * server/api/webhooks/mailgun/inbound.post.ts
 *
 * 📥 WEBHOOK INBOUND MAILGUN — Réception des emails entrants
 *
 * Mailgun reçoit un email adressé à contact@support.techkne.com et le forwarde
 * ici en multipart/form-data via une route HTTP POST.
 *
 * Sécurité :
 *  - Vérification HMAC-SHA256 (logique officielle Mailgun)
 *  - Anti-replay : timestamp < 5 minutes
 *  - Comparaison à temps constant (anti-timing attack)
 *
 * Parsing :
 *  - readMultipartFormData() de H3
 *
 * Logique (bouchon v1) :
 *  - console.log structuré des données entrantes
 *  - Stockage en DB (table mailbox) avec toAccount = 'contact'
 *  - Réponse 200 { success: true } pour accuser réception à Mailgun
 */

import { defineEventHandler, readMultipartFormData, createError } from 'h3';
import { createHmac, timingSafeEqual } from 'crypto';
import { db } from '../../../utils/db';
import { mailbox, mailboxAttachment } from '../../../../drizzle/src/db/schema';
import { randomUUID } from 'crypto';
import { awsAssetsService } from '../../../utils/aws-assets';

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Âge maximum d'un webhook (anti-replay attack) : 5 minutes */
const MAX_WEBHOOK_AGE_SECONDS = 5 * 60;

/** 
 * Adresses de destination supportées par le Webmailer.
 * Utilisé pour mapper le champ 'recipient' Mailgun vers toAccount.
 * 
 * Configurable via MAILGUN_INBOUND_RECIPIENTS dans .env (JSON array).
 * Exemple : MAILGUN_INBOUND_RECIPIENTS='["contact@support.techkne.com"]'
 */
const INBOUND_RECIPIENT_MAP: Record<string, string> = {
  'contact@support.techkne.com': 'contact',
};

// ─── Utilitaires de parsing ───────────────────────────────────────────────────

/**
 * Extrait la valeur textuelle d'un champ multipart.
 */
function getField(parts: Awaited<ReturnType<typeof readMultipartFormData>>, name: string): string {
  const part = parts?.find(p => p.name === name);
  if (!part?.data) return '';
  return Buffer.from(part.data).toString('utf-8');
}

/**
 * Génère un extrait de texte brut à partir du HTML d'un email.
 * Utilisé pour le stockage en DB et les aperçus.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 2000); // Limite raisonnable pour la preview DB
}

// ─── Handler principal ────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  
  // ── 1. Parsing Multipart ────────────────────────────────────────────────────
  let parts: Awaited<ReturnType<typeof readMultipartFormData>>;

  try {
    parts = await readMultipartFormData(event);
  } catch (e) {
    console.error('[INBOUND] Échec du parsing multipart:', e);
    throw createError({ statusCode: 400, statusMessage: 'Bad Request — Invalid multipart body' });
  }

  if (!parts || parts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request — Empty body' });
  }

  // ── 2. Extraction des champs de signature ──────────────────────────────────
  const timestamp = getField(parts, 'timestamp');
  const token     = getField(parts, 'token');
  const signature = getField(parts, 'signature');

  // ── 3. Vérification de la présence des champs obligatoires ─────────────────
  if (!timestamp || !token || !signature) {
    console.warn('[INBOUND] Signature incomplète — rejet 401');
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized — Missing signature fields' });
  }

  // ── 4. Anti-Replay Attack : fraîcheur du timestamp ─────────────────────────
  const webhookTime = parseInt(timestamp, 10);
  if (isNaN(webhookTime)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized — Invalid timestamp' });
  }

  const now = Math.floor(Date.now() / 1000);
  const ageSeconds = Math.abs(now - webhookTime);

  if (ageSeconds > MAX_WEBHOOK_AGE_SECONDS) {
    console.warn(`[INBOUND] Replay attack détecté — âge: ${ageSeconds}s > ${MAX_WEBHOOK_AGE_SECONDS}s max`);
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized — Webhook too old (possible replay attack)' });
  }

  // ── 5. Vérification HMAC-SHA256 ────────────────────────────────────────────
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    console.error('[INBOUND] MAILGUN_WEBHOOK_SIGNING_KEY non configuré — rejet par sécurité');
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error — Signing key not configured' });
  }

  const expectedSignature = createHmac('sha256', signingKey)
    .update(timestamp.concat(token))
    .digest('hex');

  // Comparaison à temps constant : évite les timing attacks
  try {
    const a = Buffer.from(expectedSignature, 'hex');
    const b = Buffer.from(signature.toLowerCase().padEnd(expectedSignature.length, '0').substring(0, expectedSignature.length), 'hex');
    
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      console.warn('[INBOUND] Signature HMAC invalide — rejet 401');
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized — Invalid Signature' });
    }
  } catch (e: any) {
    // Si createError a été lancé depuis le bloc, on le propage
    if (e.statusCode) throw e;
    console.warn('[INBOUND] Erreur comparaison HMAC:', e.message);
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized — Invalid Signature' });
  }

  // ── 6. Extraction des données de l'email ───────────────────────────────────
  const sender      = getField(parts, 'sender');
  const from        = getField(parts, 'from');
  const recipient   = getField(parts, 'recipient');
  const subject     = getField(parts, 'subject') || '(Sans objet)';
  const bodyHtml    = getField(parts, 'body-html');
  const bodyPlain   = getField(parts, 'body-plain');
  const messageId   = getField(parts, 'Message-Id');
  const strippedText = getField(parts, 'stripped-text') || bodyPlain;

  // Parsing du nom et email de l'expéditeur
  // Format Mailgun : "Prénom Nom <email@domain.com>" ou juste "email@domain.com"
  const fromMatch  = from.match(/^(.*?)<([^>]+)>$/) || ['', '', sender];
  const fromName   = fromMatch[1]?.trim() || sender.split('@')[0];
  const fromEmail  = fromMatch[2]?.trim() || sender;

  // ── 7. Mapping de la boîte de destination ──────────────────────────────────
  // Mailgun può livrer à plusieurs destinataires (CSV), on prend le premier boîte connue
  const recipientList = recipient.split(',').map(r => r.trim());
  const toAccount = recipientList.reduce<string | null>((found, r) => {
    if (found) return found;
    return INBOUND_RECIPIENT_MAP[r.toLowerCase()] ?? null;
  }, null) ?? 'contact'; // fallback sur 'contact'

  // ── 8. LOG structuré (bouchon v1) ──────────────────────────────────────────
  console.info('[INBOUND] 📥 Nouvel email reçu:', {
    from: `${fromName} <${fromEmail}>`,
    to: recipient,
    toAccount,
    subject,
    hasHtml: !!bodyHtml,
    previewText: strippedText?.substring(0, 100),
    timestamp: new Date(webhookTime * 1000).toISOString(),
  });

  // ── 9. Stockage en DB (table mailbox) ─────────────────────────────────────
  const mailId = randomUUID();
  try {
    // A. Insertion du message principal
    await db.insert(mailbox).values({
      id: mailId,
      userId: null,
      fromName,
      fromEmail,
      subject,
      body: bodyHtml || `<p>${strippedText}</p>`,
      toAccount,
      category: 'contact',
      unread: true,
      size: Buffer.byteLength(bodyHtml || bodyPlain || '', 'utf-8'),
      date: new Date(webhookTime * 1000),
    });

    // B. Gestion des Pièces Jointes (Multipart)
    // Mailgun envoie attachment-1, attachment-2, etc. et attachment-count
    const attachmentCount = parseInt(getField(parts, 'attachment-count') || '0', 10);
    
    if (attachmentCount > 0) {
      console.info(`[INBOUND] Traitement de ${attachmentCount} pièces jointes pour le mail ${mailId}...`);
      
      const attachmentParts = parts.filter(p => p.name?.startsWith('attachment-'));
      
      for (const part of attachmentParts) {
        if (!part.data || !part.filename) continue;

        try {
          // Formatage de la clé S3 (privée/attachments/)
          const s3Key = awsAssetsService.formatKey('attachments', part.filename);
          
          // Upload vers AWS S3 (ACL privée par défaut)
          await awsAssetsService.uploadToS3(s3Key, part.data, part.type || 'application/octet-stream');

          // Sauvegarde en DB
          await db.insert(mailboxAttachment).values({
            id: randomUUID(),
            mailboxId: mailId,
            filename: part.filename,
            mimeType: part.type || 'application/octet-stream',
            size: part.data.length,
            r2Key: s3Key, // Le champ s'appelle 'r2Key' en DB mais stocke la clé S3 AWS
          });

          // Finalisation (Tagging S3 status=validated)
          await awsAssetsService.finalizeAsset(s3Key);
          
          console.info(`[INBOUND] Pièce jointe validée: ${part.filename} (${s3Key})`);
        } catch (attErr: any) {
          console.error(`[INBOUND] Échec traitement pièce jointe ${part.filename}:`, attErr.message);
        }
      }
    }

    console.info(`[INBOUND] ✅ Email stocké en DB — de: ${fromEmail} → boîte: ${toAccount}`);
  } catch (dbErr: any) {
    // On log l'erreur DB mais on retourne quand même 200 à Mailgun
    // pour qu'il ne re-tente pas indéfiniment (le message est reçu côté Mailgun)
    console.error('[INBOUND] Erreur DB lors du stockage de l\'email entrant:', dbErr.message);
  }

  // ── 10. Réponse 200 — CRITIQUE : Mailgun doit recevoir un 2xx ──────────────
  // Sinon il marque le webhook comme échoué et re-tente pendant 8 heures.
  return { success: true };
});

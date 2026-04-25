/**
 * server/api/webhooks/mailgun/inbound.post.ts
 *
 * 📥 WEBHOOK INBOUND MAILGUN — Réception des emails entrants
 *
 * Mailgun reçoit un email adressé à contact@support.techkne.com et le forwarde
 * ici via une route HTTP POST.
 *
 * ⚠️  Content-Type selon le mode Mailgun :
 *  - "store+notify" : application/x-www-form-urlencoded (sans pièces jointes)
 *  - "forward"      : multipart/form-data (avec pièces jointes)
 *  → Ce handler supporte les DEUX formats automatiquement.
 *
 * Sécurité :
 *  - Vérification HMAC-SHA256 (logique officielle Mailgun)
 *  - Anti-replay : timestamp < 5 minutes
 *  - Comparaison à temps constant (anti-timing attack)
 */

import { defineEventHandler, readMultipartFormData, readBody, getHeader, createError } from 'h3';
import { createHmac, timingSafeEqual } from 'crypto';
import { db } from '../../../utils/db';
import { mailbox, mailboxAttachment } from '../../../../drizzle/src/db/schema';
import { randomUUID } from 'crypto';
import { awsAssetsService } from '../../../utils/aws-assets';
import { notify } from '../../../utils/notify';

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Âge maximum d'un webhook (anti-replay attack) : 5 minutes */
const MAX_WEBHOOK_AGE_SECONDS = 5 * 60;

/**
 * Adresses de destination supportées par le Webmailer.
 * Utilisé pour mapper le champ 'recipient' Mailgun vers toAccount.
 */
const INBOUND_RECIPIENT_MAP: Record<string, string> = {
  'contact@support.techkne.com': 'contact',
};

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Représentation normalisée d'un champ parsé — identique
 * que le corps soit URL-encoded ou multipart.
 */
interface ParsedField {
  name: string;
  value: string;
  data?: Buffer;
  filename?: string;
  type?: string;
}

// ─── Parsing universel ────────────────────────────────────────────────────────

/**
 * Parse le corps de la requête en fonction du Content-Type.
 * 
 * Mailgun envoie en x-www-form-urlencoded pour les webhooks "store+notify"
 * (sans pièces jointes) et en multipart/form-data quand il y a des fichiers.
 */
async function parseMailgunBody(event: any): Promise<ParsedField[]> {
  const contentType = getHeader(event, 'content-type') || '';

  // ── Cas 1 : multipart/form-data (avec pièces jointes potentielles) ──────────
  if (contentType.includes('multipart/form-data')) {
    const parts = await readMultipartFormData(event);
    if (!parts) return [];
    return parts.map(p => ({
      name: p.name || '',
      value: p.name && !p.filename ? Buffer.from(p.data).toString('utf-8') : '',
      data: p.filename ? p.data : undefined,
      filename: p.filename,
      type: p.type,
    }));
  }

  // ── Cas 2 : application/x-www-form-urlencoded (store+notify standard) ───────
  if (contentType.includes('application/x-www-form-urlencoded') || contentType === '') {
    // readBody décode automatiquement l'URL encoding
    const body = await readBody(event);
    if (!body || typeof body !== 'object') return [];
    return Object.entries(body).map(([name, value]) => ({
      name,
      value: Array.isArray(value) ? value.join(',') : String(value ?? ''),
    }));
  }

  console.warn('[INBOUND] Content-Type non reconnu:', contentType);
  return [];
}

/**
 * Extrait la valeur d'un champ depuis les champs parsés.
 */
function getField(fields: ParsedField[], name: string): string {
  // Recherche insensible à la casse pour absorber les variantes Mailgun
  const field = fields.find(f => f.name.toLowerCase() === name.toLowerCase());
  return field?.value || '';
}

/**
 * Génère un extrait de texte brut à partir du HTML d'un email.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 2000);
}

// ─── Handler principal ────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {

  const contentType = getHeader(event, 'content-type') || '(absent)';
  console.info('[INBOUND] Requête reçue — Content-Type:', contentType);

  // ── 1. Parsing universel (multipart OU url-encoded) ─────────────────────────
  let fields: ParsedField[];

  try {
    fields = await parseMailgunBody(event);
  } catch (e) {
    console.error('[INBOUND] Échec du parsing du corps:', e);
    throw createError({ statusCode: 400, statusMessage: 'Bad Request — Cannot parse body' });
  }

  if (!fields || fields.length === 0) {
    console.error('[INBOUND] Corps vide ou non parseable. Content-Type:', contentType);
    throw createError({ statusCode: 400, statusMessage: 'Bad Request — Empty body' });
  }

  // ── 2. Extraction des champs de signature ──────────────────────────────────
  const timestamp = getField(fields, 'timestamp');
  const token     = getField(fields, 'token');
  const signature = getField(fields, 'signature');

  console.info('[INBOUND] Champs signature — timestamp:', timestamp, '| token:', token?.substring(0, 8) + '...', '| signature présente:', !!signature);

  // ── 3. Vérification de la présence des champs obligatoires ─────────────────
  if (!timestamp || !token || !signature) {
    console.warn('[INBOUND] Signature incomplète — champs présents:', fields.map(f => f.name).join(', '));
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
    const sigLower = signature.toLowerCase();
    // Pad/trim pour alignement strict de longueur
    const b = Buffer.from(sigLower.padEnd(expectedSignature.length, '0').substring(0, expectedSignature.length), 'hex');

    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      console.warn('[INBOUND] Signature HMAC invalide');
      console.warn('[INBOUND] Attendue:', expectedSignature);
      console.warn('[INBOUND] Reçue:   ', sigLower);
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized — Invalid Signature' });
    }
  } catch (e: any) {
    if (e.statusCode) throw e;
    console.warn('[INBOUND] Erreur comparaison HMAC:', e.message);
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized — Invalid Signature' });
  }

  console.info('[INBOUND] ✅ Signature HMAC valide');

  // ── 6. Extraction des données de l'email ───────────────────────────────────
  const sender      = getField(fields, 'sender');
  const from        = getField(fields, 'From') || getField(fields, 'from');
  const recipient   = getField(fields, 'recipient');
  const subject     = getField(fields, 'subject') || getField(fields, 'Subject') || '(Sans objet)';
  const bodyHtml    = getField(fields, 'body-html') || getField(fields, 'stripped-html');
  const bodyPlain   = getField(fields, 'body-plain');
  const strippedText = getField(fields, 'stripped-text') || bodyPlain;

  // Parsing du nom et email de l'expéditeur
  const fromMatch  = from.match(/^(.*?)<([^>]+)>$/) || ['', '', sender];
  const fromName   = fromMatch[1]?.trim() || sender.split('@')[0];
  const fromEmail  = fromMatch[2]?.trim() || sender;

  // ── 7. Mapping de la boîte de destination ──────────────────────────────────
  const recipientList = recipient.split(',').map(r => r.trim());
  const toAccount = recipientList.reduce<string | null>((found, r) => {
    if (found) return found;
    return INBOUND_RECIPIENT_MAP[r.toLowerCase()] ?? null;
  }, null) ?? 'contact';

  // ── 8. LOG structuré ───────────────────────────────────────────────────────
  console.info('[INBOUND] 📥 Nouvel email reçu:', {
    from: `${fromName} <${fromEmail}>`,
    to: recipient,
    toAccount,
    subject,
    hasHtml: !!bodyHtml,
    hasText: !!strippedText,
    previewText: strippedText?.substring(0, 100),
    timestamp: new Date(webhookTime * 1000).toISOString(),
    contentType,
  });

  // ── 9. Stockage en DB (table mailbox) ─────────────────────────────────────
  const mailId = randomUUID();
  try {
    await db.insert(mailbox).values({
      id: mailId,
      userId: null,
      fromName,
      fromEmail,
      subject,
      body: bodyHtml || strippedText || '',
      isHtml: !!bodyHtml, // true si le corps est du HTML (email riche)
      toAccount,
      category: 'contact',
      unread: true,
      size: Buffer.byteLength(bodyHtml || bodyPlain || '', 'utf-8'),
      date: new Date(webhookTime * 1000),
    });

    // B. Gestion des Pièces Jointes (uniquement si multipart)
    const attachmentFields = fields.filter(f => f.name?.startsWith('attachment-') && f.filename && f.data);

    if (attachmentFields.length > 0) {
      console.info(`[INBOUND] Traitement de ${attachmentFields.length} pièce(s) jointe(s) pour le mail ${mailId}...`);

      for (const att of attachmentFields) {
        if (!att.data || !att.filename) continue;
        try {
          const s3Key = awsAssetsService.formatKey('attachments', att.filename);
          await awsAssetsService.uploadToS3(s3Key, att.data, att.type || 'application/octet-stream');
          await db.insert(mailboxAttachment).values({
            id: randomUUID(),
            mailboxId: mailId,
            filename: att.filename,
            mimeType: att.type || 'application/octet-stream',
            size: att.data.length,
            s3Key: s3Key,
          });
          // Finalisation (Tagging S3 status=validated)
          await awsAssetsService.finalizeAsset(s3Key);
          
          console.info(`[INBOUND] Pièce jointe validée: ${att.filename} (${s3Key})`);
        } catch (attErr: any) {
          console.error(`[INBOUND] Échec traitement pièce jointe ${att.filename}:`, attErr.message);
        }
      }
    }

    console.info(`[INBOUND] ✅ Email stocké en DB — de: ${fromEmail} → boîte: ${toAccount}`);

    // ── Notification In-App : alerter les personnes gérant le mail via SSE ─────────────
    await notify.permission('manage_mail', {
      type: 'new_mail',
      title: `Nouvel email de ${fromName || fromEmail}`,
      body: subject,
      actionUrl: `/dashboard/com/webmailer/${mailId}`,
    });

  } catch (dbErr: any) {
    // On log l'erreur DB mais on retourne quand même 200 à Mailgun
    // pour qu'il ne re-tente pas indéfiniment (le message est reçu côté Mailgun)
    console.error('[INBOUND] Erreur DB lors du stockage de l\'email entrant:', dbErr.message);
  }

  // ── 10. Réponse 200 — CRITIQUE : Mailgun doit recevoir un 2xx ──────────────
  // Sinon il marque le webhook comme échoué et re-tente pendant 8 heures.
  return { success: true };
});

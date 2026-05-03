/**
 * Robust EML Parser and Mail Utilities
 * 
 * UPDATED: Pièces jointes inbound désormais gérées via StorageService.
 * - Déduplication SHA-256 avant upload
 * - Asset lié à la table `asset` (source unique)
 * - mailbox_attachment reçoit asset_id pour traçabilité
 */

import { simpleParser, MailParser } from 'mailparser';
import type { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { StorageService, computeSha256 } from './storage-service';

interface ParsedEML {
  subject: string;
  from: { name: string; email: string; raw: string };
  date: string;
  body: string;
  text?: string;
  attachments?: ParsedAttachment[];
}

export interface ParsedAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  s3Key: string;
  publicUrl: string | null;
  url: string;
  assetId: string;
}

/**
 * Parses a raw EML string and extracts relevant metadata and content using mailparser.
 */
export const parseEML = async (content: string): Promise<ParsedEML> => {
  const parsed = await simpleParser(content);

  const rawFrom = parsed.from?.text || '';
  
  return {
    subject: parsed.subject || '(Sans objet)',
    from: formatEmailAddress(rawFrom),
    date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
    body: parsed.html || parsed.text || '',
    text: parsed.text,
    attachments: parsed.attachments?.map(att => ({
      filename: att.filename ?? 'fichier',
      contentType: att.contentType,
      size: att.size,
      content: att.content // Binaire — non exposé en dehors du module
    })) as any
  };
};

/**
 * Parses an EML stream and uploads attachments via StorageService.
 * 
 * Flux :
 *  1. Parsing streaming (memory-efficient)
 *  2. Pour chaque pièce jointe : calcul SHA-256 → déduplication → upload
 *  3. Les métadonnées retournées incluent assetId pour insertion dans mailbox_attachment
 */
export const streamParseEML = async (stream: Readable, systemUserId: string = 'system'): Promise<ParsedEML> => {
  return new Promise((resolve, reject) => {
    const parser = new MailParser();
    const uploadPromises: Promise<any>[] = [];
    const attachments: ParsedAttachment[] = [];
    let meta: any = {};

    parser.on('headers', (headers) => {
      meta.subject = headers.get('subject') || '(Sans objet)';
      const fromHeader: any = headers.get('from');
      meta.from = formatEmailAddress(fromHeader?.text || (typeof fromHeader === 'string' ? fromHeader : ''));
      meta.date = headers.get('date') ? new Date(headers.get('date') as string).toISOString() : new Date().toISOString();
    });

    parser.on('data', (data) => {
      if (data.type === 'text') {
        if (data.html) meta.body = data.html;
        if (data.text && !meta.body) meta.body = data.text;
        meta.text = data.text;
      }

      if (data.type === 'attachment') {
        // Collect buffer chunks to compute hash before upload
        const chunks: Buffer[] = [];
        data.content.on('data', (chunk: Buffer) => chunks.push(chunk));

        const uploadPromise = new Promise<void>((res, rej) => {
          data.content.on('end', async () => {
            try {
              const buffer = Buffer.concat(chunks);
              const hash = computeSha256(buffer);

              const stored = await StorageService.upload({
                body: buffer,
                filename: data.filename || 'attachment',
                mimeType: data.contentType,
                size: buffer.length,
                type: 'mailbox_attachment',
                userId: systemUserId,
                visibility: 'private', // Inbound attachments = always private (signed URL required)
                deduplicate: true,     // Reuse if exact same file was already received
              });

              attachments.push({
                id: randomUUID(),
                filename: data.filename || 'attachment',
                contentType: data.contentType,
                size: buffer.length,
                s3Key: stored.s3Key,
                publicUrl: stored.publicUrl,
                url: stored.url,
                assetId: stored.id,
              });

              res();
            } catch (err) {
              rej(err);
            }
          });
          data.content.on('error', rej);
        });

        uploadPromises.push(uploadPromise);
        data.release();
      }
    });

    parser.on('end', async () => {
      try {
        await Promise.all(uploadPromises);
        resolve({ ...meta, attachments });
      } catch (err) {
        reject(err);
      }
    });

    parser.on('error', reject);
    stream.pipe(parser);
  });
};

/**
 * Cleans and formats an email address string like "John Doe <john@example.com>"
 */
export const formatEmailAddress = (raw: string): { name: string; email: string, raw: string } => {
  if (!raw) return { name: 'Inconnu', email: '', raw: '' };

  const emailMatch = raw.match(/<([^>]+)>/);
  const email = emailMatch ? emailMatch[1].trim() : raw.trim();
  let name = raw.replace(/<[^>]+>/, '').trim();

  // Clean quotes from name
  name = name.replace(/^["']|["']$/g, '');

  if (!name && email) {
    name = email.split('@')[0];
  }

  return { 
    name: name || 'Inconnu', 
    email: email.toLowerCase(), 
    raw 
  };
};

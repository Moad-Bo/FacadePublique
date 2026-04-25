/**
 * Robust EML Parser and Mail Utilities
 */

import { simpleParser, MailParser } from 'mailparser';
import { uploadStreamToS3, updateObjectTags } from './r2';
import { randomUUID } from 'crypto';
import type { Readable } from 'stream';

interface ParsedEML {
  subject: string;
  from: { name: string; email: string; raw: string };
  date: string;
  body: string;
  text?: string;
  attachments?: any[];
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
      filename: att.filename,
      contentType: att.contentType,
      size: att.size,
      content: att.content // Binaire
    }))
  };
};

/**
 * Parses an EML stream and uploads attachments to R2 in parallel (Voie Inbound)
 * This is memory efficient for large emails.
 */
export const streamParseEML = async (stream: Readable): Promise<ParsedEML> => {
  return new Promise((resolve, reject) => {
    const parser = new MailParser();
    const uploadPromises: Promise<any>[] = [];
    const attachments: any[] = [];
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
        const attachmentId = randomUUID();
        const s3Key = `attachments/${attachmentId}-${data.filename}`;
        
        // Start streaming upload to R2 immediately
        const uploadPromise = uploadStreamToS3(
          s3Key, 
          data.content, 
          data.contentType,
          { 'status': 'pending', 'original-filename': data.filename }
        ).then(url => {
          attachments.push({
            id: attachmentId,
            filename: data.filename,
            contentType: data.contentType,
            size: data.size,
            s3Key,
            publicUrl: url
          });
        });

        uploadPromises.push(uploadPromise);
        data.release(); // Tell parser we're handling the stream
      }
    });

    parser.on('end', async () => {
      try {
        // Wait for all uploads to finish (Wait-Lock)
        await Promise.all(uploadPromises);

        // All uploads succeeded, promote tags to "Validated"
        await Promise.all(attachments.map(att => 
          updateObjectTags(att.s3Key, { 'status': 'validated' }).catch(e => console.error(`Failed to update tag for ${att.s3Key}`, e))
        ));

        resolve({
          ...meta,
          attachments
        });
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

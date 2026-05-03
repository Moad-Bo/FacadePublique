/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  StorageService — Service de stockage objet unifié                         ║
 * ║                                                                              ║
 * ║  Remplace l'usage dual de r2.ts (Cloudflare R2) et aws-assets.ts (AWS S3). ║
 * ║  Offre une interface unique pour :                                           ║
 * ║    - Upload (Buffer ou Stream)                                               ║
 * ║    - Déduplication par hash SHA-256                                          ║
 * ║    - URL résolue selon la visibilité (public | signed | private)             ║
 * ║    - Lifecycle (pending → validated → expired)                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { createHash } from 'crypto';
import type { Readable } from 'stream';
import { db } from './db';
import { asset } from '../../drizzle/src/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// --- Low-level R2/S3 primitives (internal only) ---
import {
  uploadToS3 as _uploadBuffer,
  uploadStreamToS3 as _uploadStream,
  deleteFromS3 as _delete,
  getFromS3 as _getStream,
  updateObjectTags,
} from './r2';

// --- CloudFront signing (AWS private assets) ---
import { awsAssetsService } from './aws-assets';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AssetVisibility = 'public' | 'signed' | 'private';

/** Types d'assets reconnus par le système */
export type AssetType =
  | 'community_topic'
  | 'community_reply'
  | 'campaign'
  | 'legal'
  | 'mailbox_attachment'
  | 'email_outbound'
  | 'newsletter'
  | 'ugc'
  | 'avatar';

export interface UploadAssetOptions {
  /** Contenu du fichier : Buffer (upload direct) ou Stream (inbound email) */
  body: Buffer | Uint8Array | Readable;
  filename: string;
  mimeType: string;
  size?: number;
  type: AssetType;
  targetId?: string;
  userId: string;
  /** Détermine comment l'URL est exposée */
  visibility?: AssetVisibility;
  /** TTL en secondes pour les assets temporaires (ex: 7 jours = 604800) */
  ttlSeconds?: number;
  /**
   * Si true, calcule le SHA-256 du buffer avant l'upload et
   * réutilise un asset existant si le hash correspond (déduplication).
   * Ne fonctionne qu'avec un `body` de type Buffer/Uint8Array.
   */
  deduplicate?: boolean;
}

export interface StoredAsset {
  id: string;
  s3Key: string;
  publicUrl: string | null;
  url: string; // URL résolue (prête pour le client)
  hash: string | null;
  visibility: AssetVisibility;
  /** true si un asset existant a été réutilisé (déduplication) */
  reused?: boolean;
}

// ─── MIME type guard ──────────────────────────────────────────────────────────

const BLOCKED_EXTENSIONS = ['.exe', '.sh', '.bat', '.cmd', '.ps1', '.msi', '.dll'];
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-zip-compressed',
  'text/plain', 'text/csv',
  'audio/mpeg', 'audio/ogg',
  'video/mp4', 'video/webm',
  // Allow binary for streams (inbound EML — type will be narrowed later)
  'application/octet-stream',
]);

function guardMime(mimeType: string, filename: string): void {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    throw new Error(`[StorageService] Extension bloquée: ${ext}`);
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`[StorageService] Type MIME non autorisé: ${mimeType}`);
  }
}

// ─── URL resolution ──────────────────────────────────────────────────────────

function resolveUrl(s3Key: string, visibility: AssetVisibility, expiresIn = 3600): string {
  switch (visibility) {
    case 'signed':
      return awsAssetsService.getSignedUrl(s3Key, expiresIn);
    case 'private':
      // Private assets must be proxied through a backend endpoint, never served directly.
      return `/api/assets/serve?key=${encodeURIComponent(s3Key)}`;
    case 'public':
    default:
      return awsAssetsService.getPublicUrl(s3Key);
  }
}

// ─── Hash ─────────────────────────────────────────────────────────────────────

export function computeSha256(buffer: Buffer | Uint8Array): string {
  return createHash('sha256').update(buffer).digest('hex');
}

// ─── StorageService ───────────────────────────────────────────────────────────

export const StorageService = {
  /**
   * Upload un asset avec déduplication optionnelle.
   * 
   * Flux complet :
   *  1. Validation MIME + extension
   *  2. (optionnel) Calcul SHA-256 → lookup DB → réutilisation si doublon
   *  3. Upload sur R2 avec tag `status=pending`
   *  4. Insertion en base de données
   *  5. Promotion du tag vers `status=validated` (atomicité)
   * 
   * @returns StoredAsset avec l'URL résolue immédiatement utilisable
   */
  async upload(opts: UploadAssetOptions): Promise<StoredAsset> {
    const {
      body,
      filename,
      mimeType,
      type,
      targetId,
      userId,
      visibility = 'public',
      ttlSeconds,
      deduplicate = false,
    } = opts;

    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    guardMime(mimeType, safeFilename);

    // --- Deduplication (Buffer only) ---
    let hash: string | null = null;
    if (deduplicate && !(body instanceof (require('stream').Readable))) {
      hash = computeSha256(body as Buffer);
      const existing = await db.query.asset.findFirst({
        where: eq(asset.hash, hash),
      });
      if (existing) {
        console.info(`[StorageService] Déduplication: réutilisation de l'asset ${existing.id} (hash: ${hash.slice(0, 12)}...)`);
        const url = resolveUrl(existing.s3Key, visibility);
        return {
          id: existing.id,
          s3Key: existing.s3Key,
          publicUrl: existing.publicUrl,
          url,
          hash,
          visibility,
          reused: true,
        };
      }
    }

    // --- S3 Key generation ---
    const assetId = randomUUID();
    const s3Key = `${type}/${targetId || 'unlinked'}/${assetId}_${safeFilename}`;

    // --- Upload ---
    const isStream = typeof (body as Readable).pipe === 'function';
    if (isStream) {
      await _uploadStream(s3Key, body as Readable, mimeType, { 'status': 'pending', 'original-filename': safeFilename });
    } else {
      await _uploadBuffer(s3Key, body as Buffer, mimeType, { 'status': 'pending' });
    }

    const publicUrl = visibility === 'public' ? resolveUrl(s3Key, 'public') : null;

    // --- DB Insert ---
    const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : undefined;
    await db.insert(asset).values({
      id: assetId,
      userId,
      type,
      targetId: targetId ?? null,
      filename: safeFilename,
      mimeType,
      size: opts.size ?? (Buffer.isBuffer(body) ? body.length : 0),
      s3Key,
      publicUrl,
      hash,
      visibility,
      expiresAt: expiresAt ?? null,
      lifecycleStatus: 'pending',
    });

    // --- Finalize (S3 tag: pending → validated) ---
    try {
      await updateObjectTags(s3Key, { status: 'validated' });
      await db.update(asset)
        .set({ lifecycleStatus: 'validated' })
        .where(eq(asset.id, assetId));
    } catch (err: any) {
      console.error(`[StorageService] Échec de la validation du tag S3 pour ${s3Key}:`, err.message);
      // Non-fatal: La Lifecycle Policy S3 supprimera l'objet au bout de 24h si le tag reste "pending"
    }

    const url = resolveUrl(s3Key, visibility);
    console.info(`[StorageService] ✅ Asset créé: ${assetId} | type: ${type} | visibility: ${visibility}`);

    return { id: assetId, s3Key, publicUrl, url, hash, visibility, reused: false };
  },

  /**
   * Résout l'URL d'un asset existant selon sa visibilité stockée en base.
   * Utilisé lors de la sérialisation des listes d'assets vers le client.
   */
  resolveUrl(s3Key: string, visibility: AssetVisibility, expiresIn = 3600): string {
    return resolveUrl(s3Key, visibility, expiresIn);
  },

  /**
   * Supprime un asset de S3 ET de la base de données.
   * À utiliser lors d'une purge manuelle ou d'un job de cleanup.
   */
  async delete(assetId: string): Promise<void> {
    const record = await db.query.asset.findFirst({ where: eq(asset.id, assetId) });
    if (!record) throw new Error(`[StorageService] Asset introuvable: ${assetId}`);
    await _delete(record.s3Key);
    await db.delete(asset).where(eq(asset.id, assetId));
    console.info(`[StorageService] 🗑️ Asset supprimé: ${assetId} (${record.s3Key})`);
  },

  /**
   * Récupère le stream S3 d'un asset (pour les envois SMTP outbound).
   * Réservé aux assets de type `private` ou `mailbox_attachment`.
   */
  async getStream(s3Key: string): Promise<any> {
    return _getStream(s3Key);
  },
};

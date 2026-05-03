/**
 * POST /api/assets/upload
 * 
 * UPDATED: Utilise StorageService pour l'upload unifié avec :
 * - Validation MIME stricte (déplacée dans StorageService)
 * - Champ `visibility` en paramètre (public | signed | private)
 * - Déduplication optionnelle par hash SHA-256 (activée pour les campagnes)
 */
import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requireUserSession } from '../../utils/auth'
import { StorageService, type AssetType, type AssetVisibility } from '../../utils/storage-service'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

// Types d'assets pour lesquels la déduplication est activée par défaut
const DEDUPLICATED_TYPES = new Set<AssetType>(['campaign', 'newsletter', 'ugc', 'avatar']);

// TTL par type (secondes) — null = permanent
const DEFAULT_TTL: Partial<Record<AssetType, number>> = {
  email_outbound: 30 * 24 * 3600,  // 30 jours
  ugc: 90 * 24 * 3600,             // 90 jours
};

// Visibility par défaut selon le type
const DEFAULT_VISIBILITY: Partial<Record<AssetType, AssetVisibility>> = {
  mailbox_attachment: 'private',
  email_outbound: 'signed',
  legal: 'signed',
};

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  const parts = await readMultipartFormData(event)
  if (!parts?.length) throw createError({ statusCode: 400, message: 'Aucun fichier fourni' })

  const filePart = parts.find(p => p.name === 'file')
  const type = (parts.find(p => p.name === 'type')?.data?.toString() || 'ugc') as AssetType
  const targetId = parts.find(p => p.name === 'targetId')?.data?.toString() || undefined
  // Allow explicit override of visibility via multipart field
  const visibilityParam = parts.find(p => p.name === 'visibility')?.data?.toString() as AssetVisibility | undefined

  if (!filePart?.data) throw createError({ statusCode: 400, message: 'Fichier invalide' })

  const filename = filePart.filename || 'file'
  const mimeType = filePart.type || 'application/octet-stream'
  const size = filePart.data.length

  if (size > MAX_FILE_SIZE) {
    throw createError({ statusCode: 413, message: `Fichier trop lourd (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` })
  }

  const visibility = visibilityParam ?? DEFAULT_VISIBILITY[type] ?? 'public'
  const deduplicate = DEDUPLICATED_TYPES.has(type)
  const ttlSeconds = DEFAULT_TTL[type]

  try {
    const stored = await StorageService.upload({
      body: filePart.data,
      filename,
      mimeType,
      size,
      type,
      targetId,
      userId: session.user.id,
      visibility,
      ttlSeconds,
      deduplicate,
    })

    return {
      success: true,
      reused: stored.reused ?? false,
      asset: {
        id: stored.id,
        filename,
        size,
        mimeType,
        url: stored.url,
        visibility,
      }
    }
  } catch (e: any) {
    console.error('[/api/assets/upload] Erreur:', e.message)
    throw createError({ statusCode: e.message.includes('non autorisé') ? 415 : 500, message: e.message })
  }
})

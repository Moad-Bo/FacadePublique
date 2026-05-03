/**
 * GET /api/assets/serve?key=<s3Key>
 * 
 * Proxy sécurisé pour les assets privés (mailbox_attachment, legal, email_outbound).
 * 
 * - Requiert une session authentifiée
 * - Vérifie que l'asset appartient à l'utilisateur (ou permission manage_mail)
 * - Stream le contenu depuis R2/S3 sans exposer la clé publique directement
 */
import { defineEventHandler, getQuery, createError, setHeader } from 'h3'
import { requireUserSession } from '../../utils/auth'
import { db } from '../../utils/db'
import { asset } from '../../../drizzle/src/db/schema'
import { eq } from 'drizzle-orm'
import { StorageService } from '../../utils/storage-service'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const { key } = getQuery(event) as { key?: string }

  if (!key) throw createError({ statusCode: 400, message: 'Paramètre key manquant' })

  // Lookup DB pour vérification ownership
  const record = await db.query.asset.findFirst({ where: eq(asset.s3Key, key) })

  if (!record) throw createError({ statusCode: 404, message: 'Asset introuvable' })

  // Contrôle d'accès : propriétaire OU admin (permission manage_mail)
  const isOwner = record.userId === session.user.id
  const isAdmin = session.user.permissions?.includes('manage_mail')

  if (!isOwner && !isAdmin) {
    throw createError({ statusCode: 403, message: 'Accès refusé' })
  }

  // Si l'asset est signé (ex: CloudFront), rediriger vers l'URL signée (plus rapide)
  if (record.visibility === 'signed') {
    const signedUrl = StorageService.resolveUrl(key, 'signed', 3600)
    return sendRedirect(event, signedUrl, 302)
  }

  // Sinon, proxy stream depuis R2
  try {
    const stream = await StorageService.getStream(key)
    setHeader(event, 'Content-Type', record.mimeType)
    setHeader(event, 'Content-Disposition', `inline; filename="${record.filename}"`)
    setHeader(event, 'Cache-Control', 'private, max-age=3600')
    return stream
  } catch (e: any) {
    throw createError({ statusCode: 500, message: `Erreur de streaming: ${e.message}` })
  }
})

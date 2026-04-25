import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { db } from '../../utils/db'
import { asset } from '../../../drizzle/src/db/schema'
import { requireUserSession } from '../../utils/auth'
import { uploadToS3, getS3PublicUrl } from '../../utils/r2'
import { randomUUID } from 'crypto'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf', 'application/msword', 'text/plain', 'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'application/x-zip-compressed',
]

export default defineEventHandler(async (event) => {
    // Requires a logged in user
    const session = await requireUserSession(event)

    const parts = await readMultipartFormData(event)
    if (!parts?.length) throw createError({ statusCode: 400, message: 'Aucun fichier fourni' })

    const filePart = parts.find(p => p.name === 'file')
    const type = parts.find(p => p.name === 'type')?.data?.toString() || 'unknown'
    const targetId = parts.find(p => p.name === 'targetId')?.data?.toString() || null

    if (!filePart?.data) throw createError({ statusCode: 400, message: 'Fichier invalide' })

    const filename = filePart.filename || 'file'
    const mimeType = filePart.type || 'application/octet-stream'
    const size = filePart.data.length

    if (size > MAX_FILE_SIZE) {
        throw createError({ statusCode: 413, message: `Fichier trop lourd (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` })
    }

    // Generate a unique R2 key
    const assetId = randomUUID()
    // Prefix by type to keep R2 bucket organized
    const s3Key = `${type}/${targetId || 'temp'}/${assetId}_${filename}`

    try {
        // Upload to R2
        const publicUrl = await uploadToS3(s3Key, filePart.data, mimeType)

        // Save metadata in DB
        await db.insert(asset).values({
            id: assetId,
            userId: session.user.id,
            type: type as any,
            targetId,
            filename,
            mimeType,
            size,
            s3Key,
            publicUrl
        })

        return { 
            success: true, 
            asset: {
                id: assetId,
                filename,
                size,
                mimeType,
                url: publicUrl
            }
        }
    } catch (e: any) {
        console.error('Asset upload error:', e)
        throw createError({ statusCode: 500, message: `Upload échoué: ${e.message}` })
    }
})

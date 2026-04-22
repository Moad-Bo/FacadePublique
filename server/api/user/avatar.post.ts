import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { db } from '../../utils/db'
import { user as userTable } from '../../../drizzle/src/db/schema'
import { eq } from 'drizzle-orm'
import { uploadToS3 } from '../../utils/r2'
import { randomUUID } from 'crypto'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB for avatars
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export default defineEventHandler(async (event) => {
    const session = event.context.session
    if (!session) throw createError({ statusCode: 401, message: 'Non autorisé' })

    const parts = await readMultipartFormData(event)
    if (!parts?.length) throw createError({ statusCode: 400, message: 'Aucun fichier fourni' })

    const filePart = parts.find(p => p.name === 'file')
    if (!filePart?.data) throw createError({ statusCode: 400, message: 'Fichier invalide' })

    const mimeType = filePart.type || 'image/jpeg'
    const size = filePart.data.length

    if (!ALLOWED_TYPES.includes(mimeType)) {
        throw createError({ statusCode: 400, message: 'Format d\'image non supporté' })
    }

    if (size > MAX_FILE_SIZE) {
        throw createError({ statusCode: 413, message: 'Image trop lourde (max 2MB)' })
    }

    const extension = mimeType.split('/')[1] || 'jpg'
    const filename = `avatar-${session.user.id}-${randomUUID()}.${extension}`
    const r2Key = `avatars/${session.user.id}/${filename}`

    try {
        // Upload to R2
        const publicUrl = await uploadToS3(r2Key, filePart.data, mimeType)

        // Update User in DB
        await db.update(userTable)
            .set({ image: publicUrl })
            .where(eq(userTable.id, session.user.id))

        return { 
            success: true, 
            url: publicUrl 
        }
    } catch (e: any) {
        console.error('Avatar upload error:', e)
        throw createError({ statusCode: 500, message: `Upload échoué: ${e.message}` })
    }
})

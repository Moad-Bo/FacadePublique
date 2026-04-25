import { defineEventHandler, createError } from 'h3'
import { db } from '../../../utils/db'
import { settings } from '../../../../drizzle/src/db/schema'
import { eq } from 'drizzle-orm'
import { requireUserSession } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    // 1. Security Check
    await requireUserSession(event, { permission: 'manage_com' })

    try {
        await db.update(settings)
            .set({ value: '0' })
            .where(eq(settings.key, 'comm_quota_used'))

        return { success: true, message: "Quota réinitialisé avec succès." }
    } catch (e: any) {
        console.error('[API] Reset Quota Error:', e.message)
        throw createError({
            statusCode: 500,
            statusMessage: 'Erreur lors de la réinitialisation du quota.'
        })
    }
})

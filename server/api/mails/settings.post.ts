import { defineEventHandler, createError } from 'h3'
import { db } from '../../utils/db'
import { settings } from '../../../drizzle/src/db/schema'
import { requireUserSession } from '../../utils/auth'
import { validateBody } from '../../utils/validation'
import { z } from 'zod'

const quotaSchema = z.object({
    limit: z.number().min(1).optional(),
    period: z.number().min(1).optional(),
})

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_mail' })
    try {
        const { limit, period } = await validateBody(event, quotaSchema)

        await db.transaction(async (tx) => {
            if (limit !== undefined) {
                await tx.insert(settings)
                    .values({ key: 'comm_quota_limit', value: String(limit) })
                    .onDuplicateKeyUpdate({ set: { value: String(limit) } })
            }

            if (period !== undefined) {
                await tx.insert(settings)
                    .values({ key: 'comm_quota_period', value: String(period) })
                    .onDuplicateKeyUpdate({ set: { value: String(period) } })
            }
        });

        return { success: true }
    } catch (e: any) {
        throw createError({ 
            statusCode: 400, 
            statusMessage: e.message || 'Erreur lors de la mise à jour des paramètres' 
        })
    }
})

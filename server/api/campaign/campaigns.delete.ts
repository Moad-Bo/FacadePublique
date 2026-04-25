import { defineEventHandler, createError } from 'h3'
import { db } from '../../utils/db'
import { campaign, emailQueue } from '../../../drizzle/src/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'
import { validateBody } from '../../utils/validation'
import { z } from 'zod'

const deleteSchema = z.object({
    id: z.string().min(1, 'ID requis')
})

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_campaign' })
    
    try {
        const body = await validateBody(event, deleteSchema)
        const { id } = body

        // 1. Delete associated email queue entries if they are still pending
        await db.delete(emailQueue).where(
            and(
                eq(emailQueue.template, id),
                eq(emailQueue.status, 'pending')
            )
        )

        // 2. Delete the campaign
        await db.delete(campaign).where(eq(campaign.id, id))

        return { success: true }
    } catch (e: any) {
        console.error('Delete campaign error:', e)
        throw createError({
            statusCode: 400,
            statusMessage: e.message || 'Erreur lors de la suppression de la campagne'
        })
    }
})

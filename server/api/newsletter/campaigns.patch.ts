import { defineEventHandler, createError } from 'h3'
import { db } from '../../utils/db'
import { newsletterCampaign } from '../../../drizzle/src/db/schema'
import { eq } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'
import { validateBody } from '../../utils/validation'
import { z } from 'zod'

const patchCampaignSchema = z.object({
    id: z.string().min(1),
    status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed']),
})

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_newsletter' })
    
    try {
        const { id, status } = await validateBody(event, patchCampaignSchema)

        await db.update(newsletterCampaign)
            .set({ status })
            .where(eq(newsletterCampaign.id, id))
        
        return { success: true }
    } catch (e: any) {
        console.error('Update campaign status error:', e)
        throw createError({ 
            statusCode: 400, 
            statusMessage: e.message || 'Erreur lors de la mise à jour du statut de la campagne' 
        })
    }
})

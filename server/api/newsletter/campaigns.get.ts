import { defineEventHandler } from 'h3'
import { db } from '../../utils/db'
import { newsletterCampaign } from '../../../drizzle/src/db/schema'
import { desc } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_newsletter' })
    try {
        const campaigns = await db.select()
            .from(newsletterCampaign)
            .orderBy(desc(newsletterCampaign.createdAt))
        
        return { success: true, campaigns }
    } catch (e: any) {
        console.error('Fetch campaigns error:', e)
        return { success: false, error: e.message }
    }
})

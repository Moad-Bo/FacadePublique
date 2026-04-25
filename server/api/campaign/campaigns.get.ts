import { defineEventHandler } from 'h3'
import { db } from '../../utils/db'
import { campaign } from '../../../drizzle/src/db/schema'
import { desc } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_campaign' })
    try {
        const campaigns = await db.select()
            .from(campaign)
            .orderBy(desc(campaign.createdAt))
        
        return { success: true, campaigns }
    } catch (e: any) {
        console.error('Fetch campaigns error:', e)
        return { success: false, error: e.message }
    }
})

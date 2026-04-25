import { defineEventHandler } from 'h3'
import { db } from '../../utils/db'
import { campaignTemplate } from '../../../drizzle/src/db/schema'
import { desc } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_campaign' })
    try {
        const templates = await db.select()
            .from(campaignTemplate)
            .orderBy(desc(campaignTemplate.updatedAt))
        
        return { success: true, templates }
    } catch (e: any) {
        console.error('Fetch templates error:', e)
        return { success: false, error: e.message }
    }
})

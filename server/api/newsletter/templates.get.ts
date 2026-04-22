import { defineEventHandler } from 'h3'
import { db } from '../../utils/db'
import { newsletterTemplate } from '../../../drizzle/src/db/schema'
import { desc } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_newsletter' })
    try {
        const templates = await db.select()
            .from(newsletterTemplate)
            .orderBy(desc(newsletterTemplate.updatedAt))
        
        return { success: true, templates }
    } catch (e: any) {
        console.error('Fetch templates error:', e)
        return { success: false, error: e.message }
    }
})

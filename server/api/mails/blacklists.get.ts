import { defineEventHandler } from 'h3'
import { db } from '../../utils/db'
import { spamFilter } from '../../../drizzle/src/db/schema'
import { eq, desc } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })
    
    try {
        const blacklist = await db.select()
            .from(spamFilter)
            .where(eq(spamFilter.userId, session.user.id))
            .orderBy(desc(spamFilter.createdAt))
            
        return { success: true, blacklist }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
})

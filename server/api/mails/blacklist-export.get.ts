import { defineEventHandler, setResponseHeader, createError } from 'h3'
import { db } from '../../utils/db'
import { spamFilter } from '../../../drizzle/src/db/schema'
import { eq } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })
    
    try {
        const blacklist = await db.select()
            .from(spamFilter)
            .where(eq(spamFilter.userId, session.user.id))
            
        const content = JSON.stringify(blacklist, null, 2)
        
        setResponseHeader(event, 'Content-Type', 'application/json')
        setResponseHeader(event, 'Content-Disposition', `attachment; filename="blacklist_webmailer_${new Date().getTime()}.json"`)
        
        return content
    } catch (e: any) {
        throw createError({ statusCode: 500, message: e.message })
    }
})

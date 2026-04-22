import { defineEventHandler } from 'h3'
import { db } from '../../utils/db'
import { mailboxRule } from '../../../drizzle/src/db/schema'
import { eq } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })
    
    const rules = await db.select()
        .from(mailboxRule)
        .where(eq(mailboxRule.userId, session.user.id))
    
    return rules
})

import { defineEventHandler } from 'h3'
import { db } from '../../utils/db'
import { mailboxLabel } from '../../../drizzle/src/db/schema'
import { eq } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })
    const userId = (session as any).user?.id

    try {
        const labels = await db.select()
            .from(mailboxLabel)
            .where(eq(mailboxLabel.userId, userId))
        return { success: true, labels }
    } catch (e: any) {
        console.error('Error fetching labels:', e)
        return { success: false, labels: [] }
    }
})

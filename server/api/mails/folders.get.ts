import { defineEventHandler, getQuery } from 'h3'
import { db } from '../../utils/db'
import { mailboxFolder } from '../../../drizzle/src/db/schema'
import { eq } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })
    const userId = (session as any).user?.id

    try {
        const folders = await db.select()
            .from(mailboxFolder)
            .where(eq(mailboxFolder.userId, userId))
        return { success: true, folders }
    } catch (e: any) {
        console.error('Error fetching folders:', e)
        return { success: false, folders: [] }
    }
})

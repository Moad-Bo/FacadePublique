import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '../../utils/db'
import { mailboxRule } from '../../../drizzle/src/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })
    const body = await readBody(event)
    const { action, senderEmail, targetFolderId, name, ruleId } = body

    try {
        if (action === 'create') {
            if (!senderEmail || !targetFolderId) {
                throw createError({ statusCode: 400, message: 'Sender email and target folder are required' })
            }

            await db.insert(mailboxRule).values({
                id: randomUUID(),
                userId: session.user.id,
                name: name || `Filter for ${senderEmail}`,
                senderEmail,
                targetFolderId,
                isActive: true
            })
            return { success: true }
        } 
        else if (action === 'update') {
            const { id } = body
            if (!id) throw createError({ statusCode: 400, message: 'Rule ID is required' })
            await db.update(mailboxRule)
                .set({ senderEmail, targetFolderId })
                .where(and(eq(mailboxRule.id, id), eq(mailboxRule.userId, session.user.id)))
            return { success: true }
        }
        else if (action === 'delete') {
            if (!ruleId) throw createError({ statusCode: 400, message: 'Rule ID is required' })
            await db.delete(mailboxRule)
                .where(and(eq(mailboxRule.id, ruleId), eq(mailboxRule.userId, session.user.id)))
            return { success: true }
        }
        else if (action === 'toggle') {
            if (!ruleId) throw createError({ statusCode: 400, message: 'Rule ID is required' })
            const { isActive } = body
            await db.update(mailboxRule)
                .set({ isActive })
                .where(and(eq(mailboxRule.id, ruleId), eq(mailboxRule.userId, session.user.id)))
            return { success: true }
        }

        throw createError({ statusCode: 400, message: 'Invalid action' })
    } catch (e: any) {
        throw createError({ statusCode: 500, message: e.message })
    }
})

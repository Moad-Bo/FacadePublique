import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '../../utils/db'
import { mailbox } from '../../../drizzle/src/db/schema'
import { eq } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })
    const userId = (session as any).user?.id

    const body = await readBody(event)
    const { id, to, cc, bcc, subject, body: mailBody, layoutId, toAccount } = body

    if (!subject && !mailBody) {
        throw createError({ statusCode: 400, message: 'Draft must have at least a subject or body' })
    }

    try {
        if (id) {
            // Update existing draft
            await db.update(mailbox)
                .set({
                    fromEmail: to || '',
                    cc: cc || null,
                    bcc: bcc || null,
                    subject: subject || '(Sans objet)',
                    body: mailBody || '',
                    toAccount: toAccount || 'contact',
                    layoutId: layoutId || null,
                    date: new Date(),
                })
                .where(eq(mailbox.id, id))
            return { success: true, id }
        } else {
            // Create new draft
            const draftId = randomUUID()
            await db.insert(mailbox).values({
                id: draftId,
                userId,
                fromName: (session as any).user?.name || 'Draft',
                fromEmail: to || '',
                cc: cc || null,
                bcc: bcc || null,
                subject: subject || '(Sans objet)',
                body: mailBody || '',
                category: 'draft',
                toAccount: toAccount || 'contact',
                layoutId: layoutId || null,
                unread: false,
                size: (mailBody || '').length,
            })
            return { success: true, id: draftId }
        }
    } catch (e: any) {
        console.error('[draft] error:', e)
        throw createError({ statusCode: 500, message: e.message })
    }
})

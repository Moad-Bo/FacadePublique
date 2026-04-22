import { defineEventHandler, createError } from 'h3'
import { db } from '../../../utils/db'
import { mailboxAttachment } from '../../../../drizzle/src/db/schema'
import { eq } from 'drizzle-orm'
import { requireUserSession } from '../../../utils/auth'
import { deleteFromS3 } from '../../../utils/r2'

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_mail' })

    const id = event.context.params?.id
    if (!id) throw createError({ statusCode: 400, message: 'ID required' })

    // Find attachment
    const [attachment] = await db.select().from(mailboxAttachment).where(eq(mailboxAttachment.id, id))
    if (!attachment) throw createError({ statusCode: 404, message: 'Attachment not found' })

    try {
        // Delete from R2 first
        await deleteFromS3(attachment.r2Key)
    } catch (e: any) {
        console.warn('R2 delete warning (may not exist):', e.message)
    }

    // Delete from DB
    await db.delete(mailboxAttachment).where(eq(mailboxAttachment.id, id))

    return { success: true }
})

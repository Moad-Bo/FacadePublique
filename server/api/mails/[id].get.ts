import { defineEventHandler, createError } from 'h3'
import { db } from '../../utils/db'
import { mailbox, mailboxAttachment } from '../../../drizzle/src/db/schema'
import { eq, and, or, like } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'
import { getS3PublicUrl } from '../../utils/r2'

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_mail' })
    const id = event.context.params?.id

    if (!id) {
        throw createError({ statusCode: 400, message: 'Mail ID requis' })
    }

    try {
        const mailRecord = await db.select().from(mailbox).where(eq(mailbox.id, id)).limit(1)

        if (!mailRecord.length) {
            throw createError({ statusCode: 404, message: 'Email introuvable' })
        }

        const m = mailRecord[0]

        // Fetch attachments for main mail
        const attachments = await db.select().from(mailboxAttachment).where(eq(mailboxAttachment.mailboxId, id))

        // Find whole thread
        const normalizeSubject = (s: string) => s ? s.replace(/^(Re|Fwd|RE|FWD|LB):\s+/i, '').trim() : 'Sans sujet'
        const normSubject = normalizeSubject(m.subject)
        
        // Find other mails in the same conversation
        const threadRaw = await db.select().from(mailbox)
            .where(and(
                eq(mailbox.toAccount, m.toAccount),
                or(
                    eq(mailbox.subject, m.subject),
                    like(mailbox.subject, `%${normSubject}%`)
                )
            ))
            .orderBy(mailbox.date)

        const threadMails = await Promise.all(threadRaw.map(async (tm) => {
            const atts = await db.select().from(mailboxAttachment).where(eq(mailboxAttachment.mailboxId, tm.id))
            return {
                ...tm,
                from: {
                    name: tm.fromName,
                    email: tm.fromEmail,
                    avatar: { src: `https://i.pravatar.cc/128?u=${tm.fromEmail}` }
                },
                attachments: atts.map(a => ({
                    id: a.id,
                    filename: a.filename,
                    size: a.size,
                    mimeType: a.mimeType,
                    url: getS3PublicUrl(a.s3Key)
                }))
            }
        }))

        return {
            success: true,
            mail: {
                ...m,
                from: {
                    name: m.fromName,
                    email: m.fromEmail,
                    avatar: { src: `https://i.pravatar.cc/128?u=${m.fromEmail}` }
                },
                attachments: attachments.map(a => ({
                    id: a.id,
                    filename: a.filename,
                    size: a.size,
                    mimeType: a.mimeType,
                    url: getS3PublicUrl(a.s3Key)
                })),
                thread: threadMails
            }
        }
    } catch (e: any) {
        console.error('Error fetching mail', id, e)
        throw createError({ statusCode: 500, message: 'Server error' })
    }
})

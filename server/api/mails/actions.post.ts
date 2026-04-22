import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '../../utils/db'
import { mailbox, emailLog, mailboxFolder, spamFilter } from '../../../drizzle/src/db/schema'
import { eq, inArray, and } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })

    const body = await readBody(event)
    const { action, ids, attribute, value, folderId, labelId } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw createError({ statusCode: 400, message: 'IDs are required' })
    }

    try {
        if (action === 'toggle-attribute') {
            if (!attribute) throw createError({ statusCode: 400, message: 'Attribute is required' })
            await db.update(mailbox)
                .set({ [attribute]: value })
                .where(inArray(mailbox.id, ids))
        }
        else if (action === 'archive') {
            await db.update(mailbox)
                .set({ archived: true, trashed: false })
                .where(inArray(mailbox.id, ids))
        }
        else if (action === 'trash') {
            // Move to trash - also log the action
            await db.update(mailbox)
                .set({ trashed: true, archived: false })
                .where(inArray(mailbox.id, ids))

            // Log deletion in email_log for history tracking
            const trashedMails = await db.select().from(mailbox).where(inArray(mailbox.id, ids))
            for (const mail of trashedMails) {
                await db.insert(emailLog).values({
                    id: randomUUID(),
                    recipient: mail.fromEmail,
                    subject: `[CORBEILLE] ${mail.subject}`,
                    template: 'inbox',
                    type: 'personal',
                    status: 'deleted',
                    sentAt: new Date()
                }).catch(() => {/* ignore if email_log not available */})
            }
        }
        else if (action === 'restore') {
            await db.update(mailbox)
                .set({ trashed: false, archived: false })
                .where(inArray(mailbox.id, ids))
        }
        else if (action === 'mark-read') {
            await db.update(mailbox)
                .set({ unread: false })
                .where(inArray(mailbox.id, ids))
        }
        else if (action === 'mark-unread') {
            await db.update(mailbox)
                .set({ unread: true })
                .where(inArray(mailbox.id, ids))
        }
        else if (action === 'delete-forever') {
            // Hard delete — remove from DB entirely
            const doomed = await db.select().from(mailbox).where(inArray(mailbox.id, ids))
            
            // Log permanent deletion
            for (const mail of doomed) {
                await db.insert(emailLog).values({
                    id: randomUUID(),
                    recipient: mail.fromEmail,
                    subject: `[SUPPRIMÉ DÉFINITIVEMENT] ${mail.subject}`,
                    template: 'inbox',
                    type: 'personal',
                    status: 'deleted',
                    sentAt: new Date()
                }).catch(() => {/* ignore */})
            }

            await db.delete(mailbox).where(inArray(mailbox.id, ids))
        }
        else if (action === 'spam') {
            const { blacklist = false } = body
            
            // 1. Mark selected as spam immediately
            await db.update(mailbox)
                .set({ isSpam: true, archived: false, trashed: false })
                .where(inArray(mailbox.id, ids))
            
            // 2. Add to blacklist & Move ALL past mails from these senders to spam (Optional)
            if (blacklist) {
                const mails = await db.select().from(mailbox).where(inArray(mailbox.id, ids))
                const senderEmails = [...new Set(mails.map(m => m.fromEmail).filter(Boolean))]

                for (const email of senderEmails) {
                    await db.insert(spamFilter).values({
                        id: randomUUID(),
                        email: email!,
                        userId: session.user.id,
                        reason: 'Marked as spam by user (Selection)'
                    }).onDuplicateKeyUpdate({ set: { email: email! } })

                    // Mass move for this user
                    await db.update(mailbox)
                        .set({ isSpam: true, archived: false, trashed: false })
                        .where(and(eq(mailbox.fromEmail, email!), eq(mailbox.userId, session.user.id)))
                }
            }
        }
        else if (action === 'unspam') {
            const mails = await db.select().from(mailbox).where(inArray(mailbox.id, ids))
            const senderEmails = [...new Set(mails.map(m => m.fromEmail).filter(Boolean))]

            // 1. Mark selected as not spam
            await db.update(mailbox)
                .set({ isSpam: false })
                .where(inArray(mailbox.id, ids))
            
            // 2. Remove from blacklist & Restore ALL mails from these senders
            for (const email of senderEmails) {
                await db.delete(spamFilter).where(eq(spamFilter.email, email!))
                
                await db.update(mailbox)
                    .set({ isSpam: false })
                    .where(and(eq(mailbox.fromEmail, email!), eq(mailbox.userId, session.user.id)))
            }
        }
        else if (action === 'move-to-folder') {
            const systemFolderMapping: Record<string, any> = {
                inbox: { category: 'inbox', trashed: false, archived: false, isSpam: false, folderId: null },
                sent: { category: 'sent', trashed: false, archived: false, isSpam: false, folderId: null },
                draft: { category: 'draft', trashed: false, archived: false, isSpam: false, folderId: null },
                archive: { archived: true, trashed: false, isSpam: false, folderId: null },
                trash: { trashed: true, archived: false, isSpam: false, folderId: null },
                spam: { isSpam: true, trashed: false, archived: false, folderId: null },
                starred: { starred: true, trashed: false, archived: false, folderId: null }
            }

            if (systemFolderMapping[folderId]) {
                await db.update(mailbox)
                    .set(systemFolderMapping[folderId])
                    .where(inArray(mailbox.id, ids))
            } else {
                await db.update(mailbox)
                    .set({ folderId: folderId || null, trashed: false, archived: false, isSpam: false })
                    .where(inArray(mailbox.id, ids))
            }
        }
        else if (action === 'add-label') {
            // Fetch current labels for each mail and append
            const mailsToUpdate = await db.select().from(mailbox).where(inArray(mailbox.id, ids))
            for (const mail of mailsToUpdate) {
                const currentLabels = (mail.labels as string[]) || []
                if (!currentLabels.includes(labelId)) {
                    currentLabels.push(labelId)
                }
                await db.update(mailbox)
                    .set({ labels: currentLabels })
                    .where(eq(mailbox.id, mail.id))
            }
        }
        else if (action === 'remove-label') {
            const mailsToUpdate = await db.select().from(mailbox).where(inArray(mailbox.id, ids))
            for (const mail of mailsToUpdate) {
                const currentLabels = ((mail.labels as string[]) || []).filter(l => l !== labelId)
                await db.update(mailbox)
                    .set({ labels: currentLabels })
                    .where(eq(mailbox.id, mail.id))
            }
        }

        return { success: true }
    } catch (e: any) {
        throw createError({ statusCode: 500, message: e.message })
    }
})

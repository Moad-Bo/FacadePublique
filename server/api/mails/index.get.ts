import { defineEventHandler, getQuery } from 'h3'
import { db } from '../../utils/db'
import { mailbox, mailboxFolder, mailboxLabel, mailboxRule, spamFilter } from '../../../drizzle/src/db/schema'
import { desc, asc, eq, and, or, like, isNull, inArray } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })
    
    const query = getQuery(event)
    const account = (query.account as string) || 'contact' // contact, noreply, newsletter
    const folder = (query.folder as string) || 'inbox'    // inbox, sent, trash, archive, starred, or folder ID
    const search = (query.search as string) || ''
    const sortBy = (query.sortBy as string) || 'date'     // date, size
    const tab = (query.tab as string) || 'all'            // all, unread
    const threadMode = query.threadMode === 'true'

    // Helper to normalize subject for threading
    const normalizeSubject = (s: string) => s ? s.replace(/^(Re|Fwd|RE|FWD|LB):\s+/i, '').trim() : 'Sans sujet'

    try {
        // 1. Build WHERE conditions
        const conditions: any[] = [
            eq(mailbox.toAccount, account)
        ]

        // Folder filter
        if (folder === 'inbox') {
            conditions.push(eq(mailbox.trashed, false))
            conditions.push(eq(mailbox.archived, false))
            conditions.push(eq(mailbox.isSpam, false))
            conditions.push(or(eq(mailbox.category, 'personal'), eq(mailbox.category, 'contact'), eq(mailbox.category, 'newsletter'), eq(mailbox.category, 'system'))!)
        } else if (folder === 'trash') {
            conditions.push(eq(mailbox.trashed, true))
        } else if (folder === 'archive') {
            conditions.push(eq(mailbox.archived, true))
        } else if (folder === 'starred') {
            conditions.push(eq(mailbox.starred, true))
            conditions.push(eq(mailbox.trashed, false))
        } else if (folder === 'sent') {
            conditions.push(eq(mailbox.category, 'sent'))
            conditions.push(eq(mailbox.trashed, false))
        } else if (folder === 'draft') {
            conditions.push(eq(mailbox.category, 'draft'))
            conditions.push(eq(mailbox.trashed, false))
        } else if (folder === 'spam') {
            conditions.push(eq(mailbox.isSpam, true))
            conditions.push(eq(mailbox.trashed, false))
        } else {
            // Custom folder ID
            conditions.push(eq(mailbox.folderId, folder))
            conditions.push(eq(mailbox.trashed, false))
        }

        // Tab filter
        if (tab === 'unread') {
            conditions.push(eq(mailbox.unread, true))
        } else if (tab === 'pinned') {
            conditions.push(eq(mailbox.pinned, true))
        } else if (tab === 'important') {
            conditions.push(eq(mailbox.important, true))
        }

        // Search filter
        if (search.trim()) {
            conditions.push(
                or(
                    like(mailbox.subject, `%${search}%`),
                    like(mailbox.body, `%${search}%`),
                    like(mailbox.fromName, `%${search}%`),
                    like(mailbox.fromEmail, `%${search}%`)
                )!
            )
        }

        const sortOrder = (query.sortOrder as string) === 'asc' ? asc : desc
        const orderBy = sortBy === 'size' ? sortOrder(mailbox.size) : sortOrder(mailbox.date)

        // 3. Apply auto-filter rules for "new" mails (no folder, not archived/trashed/spam)
        if (folder === 'inbox') {
            // A. Spam Blacklist Filter (Apply first)
            const blacklist = await db.select().from(spamFilter).where(eq(spamFilter.userId, session.user.id))
            if (blacklist.length > 0) {
                const blacklistEmails = blacklist.map(b => b.email)
                // Find and move all mails matching blacklist
                await db.update(mailbox)
                    .set({ isSpam: true, archived: false, trashed: false })
                    .where(and(
                        eq(mailbox.userId, session.user.id),
                        eq(mailbox.isSpam, false),
                        inArray(mailbox.fromEmail, blacklistEmails)
                    ))
            }

            // B. Custom Rules Filter
            const rules = await db.select().from(mailboxRule).where(and(eq(mailboxRule.userId, session.user.id), eq(mailboxRule.isActive, true)))
            if (rules.length > 0) {
                // Find mails from these senders that are currently in inbox (re-fetch after spam filter)
                const inboxMails = await db.select().from(mailbox).where(and(...conditions, isNull(mailbox.folderId)))
                for (const rule of rules) {
                    const matchingMails = inboxMails.filter(m => m.fromEmail === rule.senderEmail)
                    if (matchingMails.length > 0) {
                        const idsToMove = matchingMails.map(m => m.id)
                        await db.update(mailbox).set({ folderId: rule.targetFolderId }).where(inArray(mailbox.id, idsToMove))
                    }
                }
            }
        }

        // 4. Execute query
        const rawMails = await db.select()
            .from(mailbox)
            .where(and(...conditions))
            .orderBy(desc(mailbox.pinned), orderBy)
            .limit(200) // Increase limit for threading

        // 5. Transform and handle Threading
        let finalMails = rawMails.map(m => ({
            ...m,
            from: {
                name: m.fromName,
                email: m.fromEmail,
                avatar: { src: `https://i.pravatar.cc/128?u=${m.fromEmail}` }
            }
        }))

        if (threadMode) {
            const threads = new Map<string, any>()
            for (const mail of finalMails) {
                const normSubject = normalizeSubject(mail.subject)
                const key = `${normSubject}` // Simplistic: group by normalized subject
                
                if (!threads.has(key)) {
                    threads.set(key, {
                        ...mail,
                        isThread: true,
                        threadCount: 1,
                        threadMails: [mail]
                    })
                } else {
                    const thread = threads.get(key)
                    thread.threadCount++
                    thread.threadMails.push(mail)
                    // Keep the most recent one as the main entry (rawMails is already sorted desc)
                    if (new Date(mail.date) > new Date(thread.date)) {
                        const mails = thread.threadMails
                        Object.assign(thread, mail)
                        thread.isThread = true
                        thread.threadMails = mails
                    }
                }
            }
            finalMails = Array.from(threads.values())
        }

        return finalMails.slice(0, 100)
    } catch (e: any) {
        console.error('Error fetching mails:', e)
        return []
    }
})

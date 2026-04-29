import { db } from '../utils/db'
import { mailbox, mailboxRule, spamFilter, emailLog } from '../../drizzle/src/db/schema'
import { desc, asc, eq, and, or, like, isNull, inArray, SQL } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export interface MailListOptions {
    account?: string
    folder?: string
    search?: string
    sortBy?: 'date' | 'size'
    sortOrder?: 'asc' | 'desc'
    tab?: 'all' | 'unread' | 'pinned' | 'important'
    page?: number
    limit?: number
}

export interface MailActionParams {
    action: string
    ids: string[]
    attribute?: string
    value?: any
    folderId?: string
    labelId?: string
    blacklist?: boolean
}

export const mailService = {
    /**
     * Liste les emails avec pagination SQL et filtrage
     */
    async listMails(userId: string, options: MailListOptions) {
        const {
            account = 'contact',
            folder = 'inbox',
            search = '',
            sortBy = 'date',
            sortOrder = 'desc',
            tab = 'all',
            page = 1,
            limit = 50
        } = options

        const offset = (page - 1) * limit

        const conditions: SQL[] = [eq(mailbox.toAccount, account)]

        if (folder === 'inbox') {
            conditions.push(eq(mailbox.trashed, false))
            conditions.push(eq(mailbox.archived, false))
            conditions.push(eq(mailbox.isSpam, false))
        } else if (folder === 'trash') {
            conditions.push(eq(mailbox.trashed, true))
        } else if (folder === 'archive') {
            conditions.push(eq(mailbox.archived, true))
        } else if (folder === 'spam') {
            conditions.push(eq(mailbox.isSpam, true))
        } else if (folder === 'sent') {
            conditions.push(eq(mailbox.category, 'sent'), eq(mailbox.trashed, false))
        } else if (folder === 'starred') {
            conditions.push(eq(mailbox.starred, true), eq(mailbox.trashed, false))
        } else if (folder === 'draft') {
            conditions.push(eq(mailbox.category, 'draft'), eq(mailbox.trashed, false))
        } else {
            conditions.push(eq(mailbox.folderId, folder), eq(mailbox.trashed, false))
        }

        if (tab === 'unread') conditions.push(eq(mailbox.unread, true))
        if (tab === 'pinned') conditions.push(eq(mailbox.pinned, true))
        if (tab === 'important') conditions.push(eq(mailbox.important, true))

        if (search.trim()) {
            conditions.push(
                or(
                    like(mailbox.subject, `%${search}%`),
                    like(mailbox.fromName, `%${search}%`),
                    like(mailbox.fromEmail, `%${search}%`),
                    like(mailbox.body, `%${search}%`)
                )!
            )
        }

        const orderFunc = sortOrder === 'asc' ? asc : desc
        const orderBy = sortBy === 'size' ? orderFunc(mailbox.size) : orderFunc(mailbox.date)

        const items = await db.select()
            .from(mailbox)
            .where(and(...conditions))
            .orderBy(desc(mailbox.pinned), orderBy)
            .limit(limit)
            .offset(offset)

        return items.map(m => ({
            ...m,
            from: {
                name: m.fromName,
                email: m.fromEmail,
                avatar: { src: `https://i.pravatar.cc/128?u=${m.fromEmail}` }
            }
        }))
    },

    /**
     * Exécute une action groupée sur une liste d'emails
     */
    async performActions(userId: string, params: MailActionParams) {
        const { action, ids, attribute, value, folderId, labelId, blacklist } = params

        switch (action) {
            case 'toggle-attribute':
                if (!attribute) throw new Error('Attribute is required')
                await db.update(mailbox).set({ [attribute]: value }).where(inArray(mailbox.id, ids))
                break

            case 'archive':
                await db.update(mailbox).set({ archived: true, trashed: false }).where(inArray(mailbox.id, ids))
                break

            case 'trash':
                await db.update(mailbox).set({ trashed: true, archived: false }).where(inArray(mailbox.id, ids))
                // Logging de l'action de mise à la corbeille
                await this._logMailAction(ids, 'CORBEILLE', 'deleted')
                break

            case 'restore':
                await db.update(mailbox).set({ trashed: false, archived: false }).where(inArray(mailbox.id, ids))
                break

            case 'mark-read':
                await db.update(mailbox).set({ unread: false }).where(inArray(mailbox.id, ids))
                break

            case 'mark-unread':
                await db.update(mailbox).set({ unread: true }).where(inArray(mailbox.id, ids))
                break

            case 'delete-forever':
                await this._logMailAction(ids, 'SUPPRIMÉ DÉFINITIVEMENT', 'deleted')
                await db.delete(mailbox).where(inArray(mailbox.id, ids))
                break

            case 'spam':
                await db.update(mailbox).set({ isSpam: true, archived: false, trashed: false }).where(inArray(mailbox.id, ids))
                if (blacklist) {
                    const mails = await db.select().from(mailbox).where(inArray(mailbox.id, ids))
                    const senderEmails = [...new Set(mails.map(m => m.fromEmail).filter(Boolean))]
                    for (const email of senderEmails) {
                        await db.insert(spamFilter).values({
                            id: randomUUID(),
                            email: email!,
                            userId: userId,
                            reason: 'Marked as spam by user'
                        }).onDuplicateKeyUpdate({ set: { email: email! } })
                        
                        await db.update(mailbox).set({ isSpam: true, archived: false, trashed: false })
                            .where(and(eq(mailbox.fromEmail, email!), eq(mailbox.userId, userId)))
                    }
                }
                break

            case 'unspam':
                const mailsToUnspam = await db.select().from(mailbox).where(inArray(mailbox.id, ids))
                const unspamEmails = [...new Set(mailsToUnspam.map(m => m.fromEmail).filter(Boolean))]
                await db.update(mailbox).set({ isSpam: false }).where(inArray(mailbox.id, ids))
                for (const email of unspamEmails) {
                    await db.delete(spamFilter).where(eq(spamFilter.email, email!))
                    await db.update(mailbox).set({ isSpam: false })
                        .where(and(eq(mailbox.fromEmail, email!), eq(mailbox.userId, userId)))
                }
                break

            case 'move-to-folder':
                const systemFolders: Record<string, any> = {
                    inbox: { category: 'inbox', trashed: false, archived: false, isSpam: false, folderId: null },
                    sent: { category: 'sent', trashed: false, archived: false, isSpam: false, folderId: null },
                    archive: { archived: true, trashed: false, isSpam: false, folderId: null },
                    trash: { trashed: true, archived: false, isSpam: false, folderId: null },
                    spam: { isSpam: true, trashed: false, archived: false, folderId: null },
                    starred: { starred: true, trashed: false, archived: false, folderId: null }
                }
                const updateData = systemFolders[folderId!] || { folderId: folderId || null, trashed: false, archived: false, isSpam: false }
                await db.update(mailbox).set(updateData).where(inArray(mailbox.id, ids))
                break

            case 'add-label':
                const mailsToAddLabel = await db.select().from(mailbox).where(inArray(mailbox.id, ids))
                for (const mail of mailsToAddLabel) {
                    const current = (mail.labels as string[]) || []
                    if (!current.includes(labelId!)) {
                        await db.update(mailbox).set({ labels: [...current, labelId!] }).where(eq(mailbox.id, mail.id))
                    }
                }
                break

            case 'remove-label':
                const mailsToRemoveLabel = await db.select().from(mailbox).where(inArray(mailbox.id, ids))
                for (const mail of mailsToRemoveLabel) {
                    const filtered = ((mail.labels as string[]) || []).filter(l => l !== labelId)
                    await db.update(mailbox).set({ labels: filtered }).where(eq(mailbox.id, mail.id))
                }
                break
        }
        return { success: true }
    },

    /**
     * Applique les filtres automatiques (Spam & Rules)
     */
    async processAutoFilters(userId: string) {
        try {
            const blacklist = await db.select().from(spamFilter).where(eq(spamFilter.userId, userId))
            if (blacklist.length > 0) {
                const blacklistEmails = blacklist.map(b => b.email).filter(Boolean) as string[]
                await db.update(mailbox).set({ isSpam: true, archived: false, trashed: false })
                    .where(and(eq(mailbox.userId, userId), eq(mailbox.isSpam, false), inArray(mailbox.fromEmail, blacklistEmails)))
            }
            
            const rules = await db.select().from(mailboxRule).where(and(eq(mailboxRule.userId, userId), eq(mailboxRule.isActive, true)))
            for (const rule of rules) {
                await db.update(mailbox).set({ folderId: rule.targetFolderId })
                    .where(and(eq(mailbox.userId, userId), isNull(mailbox.folderId), eq(mailbox.fromEmail, rule.senderEmail)))
            }
        } catch (e) {
            console.error('[MailService] processAutoFilters error:', e)
        }
    },

    /**
     * Helper interne pour loguer les actions dans email_log
     */
    async _logMailAction(ids: string[], prefix: string, status: string) {
        try {
            const mails = await db.select().from(mailbox).where(inArray(mailbox.id, ids))
            for (const mail of mails) {
                await db.insert(emailLog).values({
                    id: randomUUID(),
                    recipient: mail.fromEmail,
                    subject: `[${prefix}] ${mail.subject}`,
                    template: 'inbox',
                    type: 'personal',
                    status: status as any,
                    sentAt: new Date()
                })
            }
        } catch (e) { /* silent */ }
    }
}

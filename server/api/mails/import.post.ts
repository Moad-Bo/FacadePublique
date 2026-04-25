import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '../../utils/db'
import { mailbox } from '../../../drizzle/src/db/schema'
import { requireUserSession } from '../../utils/auth'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })
    
    const body = await readBody(event)
    const { mails } = body

    if (!mails || !Array.isArray(mails)) {
        throw createError({ statusCode: 400, message: 'Invalid import data' })
    }

    try {
        const valuesToInsert = mails.map((m: any) => {
            const systemFolderMapping: Record<string, any> = {
                inbox: { trashed: false, archived: false, isSpam: false, folderId: null },
                sent: { category: 'sent', trashed: false, folderId: null },
                draft: { category: 'draft', trashed: false, folderId: null },
                archive: { archived: true, folderId: null },
                trash: { trashed: true, folderId: null },
                spam: { isSpam: true, folderId: null },
                starred: { starred: true, folderId: null }
            }

            const folderConfig = systemFolderMapping[m.folderId] || { folderId: m.folderId }

            return {
                id: uuidv4(),
                userId: session.user.id,
                subject: m.subject || '(Sans objet)',
                body: m.body || '',
                isHtml: m.isHtml !== undefined ? m.isHtml : /<[a-zA-Z][^>]*>/.test(m.body || ''),
                fromEmail: m.fromEmail || 'unknown@imported.com',
                fromName: m.fromName || 'Imported User',
                date: m.date ? new Date(m.date) : new Date(),
                category: folderConfig.category || 'inbox',
                folderId: folderConfig.folderId || null,
                archived: folderConfig.archived || false,
                trashed: folderConfig.trashed || false,
                isSpam: folderConfig.isSpam || false,
                starred: folderConfig.starred || false,
                unread: false // Imported mails are usually historical
            }
        })

        if (valuesToInsert.length > 0) {
            // Bulk insert in chunks of 100 to avoid packet size issues if needed
            for (let i = 0; i < valuesToInsert.length; i += 100) {
                const chunk = valuesToInsert.slice(i, i + 100)
                await db.insert(mailbox).values(chunk)
            }
        }
            
        return { success: true, count: valuesToInsert.length }
    } catch (e: any) {
        throw createError({ statusCode: 500, message: e.message })
    }
})

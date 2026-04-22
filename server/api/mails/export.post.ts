import { defineEventHandler, readBody, createError, setResponseHeader } from 'h3'
import { db } from '../../utils/db'
import { mailbox } from '../../../drizzle/src/db/schema'
import { inArray, and, or, eq } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'
import JSZip from 'jszip'

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })
    
    const body = await readBody(event)
    const { ids, folderIds } = body

    if ((!ids || ids.length === 0) && (!folderIds || folderIds.length === 0)) {
        throw createError({ statusCode: 400, message: 'Selection or Folders are required' })
    }

    try {
        let mails: any[] = []
        
        if (ids && ids.length > 0) {
            mails = await db.select().from(mailbox).where(and(inArray(mailbox.id, ids), eq(mailbox.userId, session.user.id)))
        } else if (folderIds && folderIds.length > 0) {
            // Support both system folder names and custom folder IDs
            const systemFolderMapping: Record<string, any> = {
                inbox: and(eq(mailbox.trashed, false), eq(mailbox.archived, false), eq(mailbox.isSpam, false)),
                sent: and(eq(mailbox.category, 'sent'), eq(mailbox.trashed, false)),
                draft: and(eq(mailbox.category, 'draft'), eq(mailbox.trashed, false)),
                archive: eq(mailbox.archived, true),
                trash: eq(mailbox.trashed, true),
                spam: eq(mailbox.isSpam, true),
                starred: eq(mailbox.starred, true)
            }

            const conditions: any[] = [eq(mailbox.userId, session.user.id)]
            const folderConditions: any[] = []
            
            for (const fId of folderIds) {
                if (systemFolderMapping[fId]) {
                    folderConditions.push(systemFolderMapping[fId])
                } else {
                    folderConditions.push(eq(mailbox.folderId, fId))
                }
            }
            
            if (folderConditions.length > 0) {
                conditions.push(or(...folderConditions))
            }

            mails = await db.select().from(mailbox).where(and(...conditions))
        }
        const zip = new JSZip()

        for (const mail of mails) {
            const dateStr = mail.date ? new Date(mail.date).toUTCString() : new Date().toUTCString()
            const emlLines = [
                `Date: ${dateStr}`,
                `From: ${mail.fromName || 'Inconnu'} <${mail.fromEmail || ''}>`,
                `To: ${mail.toAccount || 'contact'}@mail.techkne.fr`,
                `Subject: ${mail.subject || '(Sans objet)'}`,
                `MIME-Version: 1.0`,
                `Content-Type: text/plain; charset=utf-8`,
                `X-Export-Source: techkne-webmailer`,
                ``,
                mail.body || ''
            ]
            
            const emlContent = emlLines.join('\r\n')
            
            // Generate a safe filename
            const cleanSubject = (mail.subject || 'sans_titre')
                .replace(/[^a-z0-9]/gi, '_')
                .substring(0, 50)
            const filename = `${cleanSubject}_${mail.id.substring(0, 8)}.eml`
            
            zip.file(filename, emlContent)
        }

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
        
        setResponseHeader(event, 'Content-Type', 'application/zip')
        setResponseHeader(event, 'Content-Disposition', `attachment; filename="export_mails_${new Date().getTime()}.zip"`)
        
        return zipBuffer
    } catch (e: any) {
        throw createError({ statusCode: 500, message: `Export failed: ${e.message}` })
    }
})

import { defineEventHandler, readBody, createError, setResponseHeader } from 'h3'
import { db } from '../../utils/db'
import { mailbox, emailLog, emailQueue } from '../../../drizzle/src/db/schema'
import { inArray, and, or, eq, gt } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'
import JSZip from 'jszip'

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })
    
    const body = await readBody(event)
    const { ids, contexts, exportType = 'journal', format = 'csv' } = body

    try {
        let exportRows: any[] = []
        
        // 1. DATA GATHERING BASED ON TYPE
        if (exportType === 'queue') {
            const conditions: any[] = []
            if (contexts && contexts.length > 0) {
                conditions.push(inArray(emailQueue.type, contexts))
            }
            const items = await db.select().from(emailQueue).where(conditions.length > 0 ? and(...conditions) : undefined)
            exportRows = items.map(q => ({
                date: q.scheduledAt,
                direction: 'outgoing (scheduled)',
                context: q.type,
                from: q.fromContext || 'system',
                to: q.recipient,
                subject: q.subject,
                status: q.status,
                error: q.errorMessage
            }))
        } else {
            // JOURNAL or ARCHIVE
            const dateLimit = new Date();
            dateLimit.setDate(dateLimit.getDate() - 90); // Export last 90 days by default if no IDs

            const logConditions: any[] = [gt(emailLog.sentAt, dateLimit)]
            const boxConditions: any[] = [gt(mailbox.date, dateLimit), eq(mailbox.category, 'inbox')]

            if (contexts && contexts.length > 0) {
                logConditions.push(inArray(emailLog.type, contexts))
                boxConditions.push(inArray(mailbox.toAccount, contexts))
            }

            const outgoing = await db.select().from(emailLog).where(and(...logConditions))
            const incoming = await db.select().from(mailbox).where(and(...boxConditions))

            exportRows = [
                ...outgoing.map(l => ({
                    date: l.sentAt,
                    direction: 'outgoing',
                    context: l.type,
                    from: l.fromAlias || l.type,
                    to: l.recipient,
                    subject: l.subject,
                    status: l.status,
                    error: l.errorMessage
                })),
                ...incoming.map(m => ({
                    date: m.date,
                    direction: 'incoming',
                    context: m.toAccount || 'inbox',
                    from: m.fromEmail,
                    to: m.toAccount || 'unknown',
                    subject: m.subject,
                    status: 'delivered',
                    error: null
                }))
            ]
        }

        // Sort by date desc
        exportRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        if (format === 'csv') {
            const now = new Date()
            const dateStr = now.toLocaleDateString('fr-FR')
            const timeStr = now.toISOString().split('T')[0].replace(/-/g, '')
            
            const selectedContexts = contexts ? contexts.join(', ') : 'Multi-Contextes'
            const modeLabel = exportType === 'queue' ? 'PROGRAMMATION' : exportType === 'archive' ? 'ARCHIVAGE' : 'JOURNAL'
            
            const lines = [
                `TYPE D'EXPORT: ${modeLabel}`,
                `CONTEXTE(S): ${selectedContexts}`,
                `DATE D'EXPORT: ${dateStr}`,
                `GENERE PAR: ${session.user.email}`,
                ``,
                `Date,Direction,Contexte,Expéditeur,Destinataire,Objet,Statut,Erreur/Info`
            ]

            for (const r of exportRows) {
                const row = [
                    r.date ? new Date(r.date).toLocaleString('fr-FR') : '-',
                    r.direction,
                    r.context || '-',
                    `"${(r.from || '').replace(/"/g, '""')}"`,
                    `"${(r.to || '').replace(/"/g, '""')}"`,
                    `"${(r.subject || '').replace(/"/g, '""')}"`,
                    r.status,
                    `"${(r.error || '').replace(/"/g, '""')}"`
                ]
                lines.push(row.join(','))
            }

            const csvContent = lines.join('\n')
            
            const typeSlug = exportType === 'queue' ? 'Prog' : exportType === 'archive' ? 'Arch' : 'Log'
            const contextSlug = contexts && contexts.length > 0 
                ? contexts.map((c: string) => c.charAt(0).toUpperCase() + c.slice(1)).join('_') 
                : 'Multi'
            const filename = `Exp${typeSlug}_${contextSlug}_${timeStr}.csv`

            setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
            setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
            
            return csvContent
        }

        // Fallback for ZIP (only works for Journal/Archive mailbox items for now)
        // If it's a queue export, ZIP is not supported yet (EML requires body which is in queue blob)
        throw createError({ statusCode: 400, message: 'Format non supporté pour ce type d\'export' })

    } catch (e: any) {
        console.error('Export failed:', e)
        throw createError({ statusCode: 500, message: `Export failed: ${e.message}` })
    }
})

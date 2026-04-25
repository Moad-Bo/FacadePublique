import { defineEventHandler, createError, setHeader } from 'h3'
import { db } from '../../../utils/db'
import { emailLog } from '../../../../drizzle/src/db/schema'
import { requireUserSession } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_com' })
    try {
        // Fetch logs
        const logs = await db.select().from(emailLog)

        // Convert to CSV
        const headers = ['id', 'recipient', 'subject', 'template', 'type', 'status', 'errorMessage', 'sentAt', 'openedAt', 'openCount']
        const csvRows = [headers.join(',')]
        
        for (const log of logs) {
            const values = headers.map(header => {
                const val = (log as any)[header]
                if (val instanceof Date) return `"${val.toISOString()}"`
                if (val === null || val === undefined) return '""'
                return `"${String(val).replace(/"/g, '""')}"`
            })
            csvRows.push(values.join(','))
        }

        const csvContent = csvRows.join('\n')

        setHeader(event, 'Content-Type', 'text/csv')
        setHeader(event, 'Content-Disposition', 'attachment; filename="email_logs_export.csv"')

        return csvContent
    } catch (e: any) {
        console.error('[API] Error exporting logs:', e)
        throw createError({ statusCode: 500, message: 'Erreur interne lors de l\'export des logs.' })
    }
})

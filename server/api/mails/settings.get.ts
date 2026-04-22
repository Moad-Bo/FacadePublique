import { defineEventHandler, createError } from 'h3'
import { db } from '../../utils/db'
import { settings, emailLog } from '../../../drizzle/src/db/schema'
import { sql, gt } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_mail' })
    try {
        const allSettings = await db.select().from(settings).catch(() => [])
        const settingsMap: Record<string, string> = {}
        allSettings.forEach(curr => {
            settingsMap[curr.key] = curr.value
        })

        const limit = parseInt(settingsMap.comm_quota_limit || '3000')
        const periodDays = parseInt(settingsMap.comm_quota_period || '30')

        // Calculate usage
        let currentUsage = 0
        try {
            const dateLimit = new Date()
            dateLimit.setDate(dateLimit.getDate() - periodDays)

            const usageResult = await db.select({ 
                count: sql<number>`count(*)` 
            })
            .from(emailLog)
            .where(gt(emailLog.sentAt, dateLimit))

            currentUsage = Number(usageResult[0]?.count || 0)
        } catch (logErr) {
            console.error('Error fetching email usage logs:', logErr)
            // Fallback to 0 if table doesn't exist yet
        }

        return {
            success: true,
            settings: {
                limit,
                period: periodDays,
                currentUsage,
                percent: Math.min(Math.round((currentUsage / limit) * 100), 100)
            }
        }
    } catch (e: any) {
        console.error('Settings API Error:', e)
        throw createError({ statusCode: 500, message: 'Erreur interne du serveur lors de la récupération des paramètres.' })
    }
})

import { defineEventHandler, createError } from 'h3'
import { db } from '../../utils/db'
import { settings, mailboxFolder } from '../../../drizzle/src/db/schema'
import { eq } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })
    try {
        const allSettings = await db.select().from(settings).catch(() => [])
        const settingsMap: Record<string, string> = {}
        allSettings.forEach(curr => {
            settingsMap[curr.key] = curr.value
        })

        const limit = parseInt(settingsMap.comm_quota_limit || '3000')
        const periodDays = parseInt(settingsMap.comm_quota_period || '30')
        const currentUsage = parseInt(settingsMap.comm_quota_used || '0')

        // Fetch user custom folders
        const folders = await db.select().from(mailboxFolder).where(eq(mailboxFolder.userId, session.user.id))

        // System folders (matches webmailer sidebar)
        const systemFolders = [
            { id: 'inbox', label: 'Boîte de réception', icon: 'i-lucide:inbox' },
            { id: 'sent', label: 'Envoyés', icon: 'i-lucide:send' },
            { id: 'archive', label: 'Archives', icon: 'i-lucide:archive' },
            { id: 'spam', label: 'Spam', icon: 'i-lucide:shield-alert' },
            { id: 'trash', label: 'Corbeille', icon: 'i-lucide:trash-2' }
        ]

        return {
            success: true,
            folders,
            systemFolders,
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


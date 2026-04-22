import { defineEventHandler } from 'h3'
import { db } from '../utils/db'
import { audience } from '../../drizzle/src/db/schema'
import { desc, eq } from 'drizzle-orm'
import { requireUserSession } from '../utils/auth'

export default defineEventHandler(async (event) => {
    // 1. Security Check: Only newsletter managers/admins can view the full list
    await requireUserSession(event, { permission: 'manage_newsletter' })

    try {
        const subscribers = await db.select()
            .from(audience)
            .where(eq(audience.optInNewsletter, true))
            .orderBy(desc(audience.createdAt))
            .catch((e) => {
                console.warn('[API] Newsletter subscribers fetch failed:', e)
                return []
            })

        // Transform for UI (Consistent with previous mock/Dashboard expectations)
        return subscribers.map(s => ({
            id: s.id,
            name: s.email.split('@')[0], // Fallback name
            email: s.email,
            status: s.unsubscribedAt ? 'unsubscribed' : 'subscribed',
            subscribedAt: s.createdAt,
            avatar: { src: `https://i.pravatar.cc/128?u=${s.id}` }
        }))
    } catch (e: any) {
        console.error('[API] Members Fetch Error:', e.message)
        throw createError({
            statusCode: 500,
            statusMessage: 'Erreur lors de la récupération des membres.'
        })
    }
})

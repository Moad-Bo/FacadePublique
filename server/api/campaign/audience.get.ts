import { defineEventHandler } from 'h3'
import { db } from '../../utils/db'
import { audience } from '../../../drizzle/src/db/schema'
import { desc, eq } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    // 1. Security Check: Block public access
    await requireUserSession(event, { permission: 'manage_campaign' })

    try {
        const subscribers = await db.select()
            .from(audience)
            .where(eq(audience.optInMarketing, true))
            .orderBy(desc(audience.createdAt))
            .catch((e) => {
                console.warn('[API] Newsletter subscribers fetch failed:', e)
                return []
            })

        return subscribers.map(s => ({
            ...s,
            id: s.id,
            email: s.email,
            subscribedAt: s.createdAt,
            status: s.unsubscribedAt ? 'unsubscribed' : 'subscribed',
            avatar: { src: `https://i.pravatar.cc/128?u=${s.id}` }
        }))
    } catch (e) {
        console.error('[API] Subscribers Error:', e)
        return []
    }
})

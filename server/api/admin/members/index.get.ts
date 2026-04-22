import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '../../../utils/db'
import { audience, user } from '../../../../drizzle/src/db/schema'
import { desc, eq, or, and, isNull } from 'drizzle-orm'
import { requireUserSession } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
    // 1. Security Check: Only admin or those with 'manage_membre' permission
    await requireUserSession(event, { permission: 'manage_membre' })

    const query = getQuery(event)
    const type = query.type as string | undefined // 'newsletter', 'blog', 'forum'

    try {
        let results: any[] = []

        if (type === 'newsletter' || !type) {
            const subscribers = await db.select()
                .from(audience)
                .where(eq(audience.optInNewsletter, true))
                .orderBy(desc(audience.createdAt))
            
            results.push(...subscribers.map(s => ({
                id: s.id,
                email: s.email,
                name: s.email.split('@')[0],
                status: s.unsubscribedAt ? 'unsubscribed' : 'subscribed',
                type: 'newsletter',
                subscribedAt: s.createdAt,
                cookieChoice: null,
                contactInfo: null,
                isGuest: true
            })))
        }

        if (type === 'blog' || type === 'forum' || !type) {
            const members = await db.select()
                .from(user)
                .where(eq(user.role, 'membre'))
                .orderBy(desc(user.createdAt))
            
            results.push(...members.map(m => ({
                id: m.id,
                email: m.email,
                name: m.name,
                status: m.banned ? 'banned' : 'active',
                type: (type === 'blog' || type === 'forum') ? type : 'member',
                subscribedAt: m.createdAt,
                isGuest: false
            })))
        }

        return { success: true, members: results }
    } catch (e: any) {
        console.error('[API] Members List Error:', e.message)
        throw createError({
            statusCode: 500,
            statusMessage: 'Erreur lors du chargement des membres.'
        })
    }
})

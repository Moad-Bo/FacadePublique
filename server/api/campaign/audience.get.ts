import { defineEventHandler } from 'h3'
import { db } from '../../utils/db'
import { audience } from '../../../drizzle/src/db/schema'
import { desc } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    // 1. Security Check: Block public access
    await requireUserSession(event, { permission: 'manage_campaign' })

    try {
        // Retourne TOUS les abonnés avec tous les champs opt-in exposés.
        // Le filtrage par contexte de campagne est géré côté frontend
        // pour permettre l'affichage granulaire (newsletter / changelog / promo).
        const subscribers = await db.select()
            .from(audience)
            .orderBy(desc(audience.createdAt))
            .catch((e) => {
                console.warn('[API] Audience fetch failed:', e)
                return []
            })

        return subscribers.map(s => ({
            id: s.id,
            email: s.email,
            userId: s.userId,
            // Opt-ins granulaires — tous exposés
            optInNewsletter: s.optInNewsletter,
            optInMarketing: s.optInMarketing,
            optInChangelog: s.optInChangelog,
            optInForum: s.optInForum,
            optInMentions: s.optInMentions,
            optInReplies: s.optInReplies,
            source: s.source,
            unsubscribedAt: s.unsubscribedAt,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            // Helpers calculés
            isActive: !s.unsubscribedAt,
            avatar: { src: `https://i.pravatar.cc/128?u=${s.id}` }
        }))
    } catch (e) {
        console.error('[API] Audience Error:', e)
        return []
    }
})


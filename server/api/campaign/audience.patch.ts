import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '../../utils/db'
import { audience } from '../../../drizzle/src/db/schema'
import { eq } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'
import { z } from 'zod'

const patchSchema = z.object({
    id: z.string().min(1, 'ID requis'),
    optInNewsletter: z.boolean().optional(),
    optInMarketing: z.boolean().optional(),
    optInChangelog: z.boolean().optional(),
    optInForum: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_campaign' })

    try {
        const body = patchSchema.parse(await readBody(event))
        const { id, ...updates } = body

        // Ne mettre à jour que les champs fournis
        const updatePayload: Record<string, boolean> = {}
        if (typeof updates.optInNewsletter === 'boolean') updatePayload.optInNewsletter = updates.optInNewsletter
        if (typeof updates.optInMarketing === 'boolean') updatePayload.optInMarketing = updates.optInMarketing
        if (typeof updates.optInChangelog === 'boolean') updatePayload.optInChangelog = updates.optInChangelog
        if (typeof updates.optInForum === 'boolean') updatePayload.optInForum = updates.optInForum

        if (Object.keys(updatePayload).length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'Aucun champ à mettre à jour' })
        }

        await db.update(audience)
            .set(updatePayload)
            .where(eq(audience.id, id))

        return { success: true, id, updated: updatePayload }
    } catch (e: any) {
        console.error('[API] Audience PATCH error:', e)
        throw createError({ statusCode: 400, statusMessage: e.message || 'Erreur mise à jour audience' })
    }
})

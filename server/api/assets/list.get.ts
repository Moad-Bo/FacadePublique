import { defineEventHandler, getQuery } from 'h3'
import { db } from '../../utils/db'
import { asset } from '../../../drizzle/src/db/schema'
import { eq, desc } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    // Requires a logged in user (optional: check permission for specific types)
    await requireUserSession(event)

    const query = getQuery(event)
    const type = query.type as string

    if (!type) {
        throw createError({
            statusCode: 400,
            message: 'Le paramètre type est requis'
        })
    }

    try {
        const results = await db.select()
            .from(asset)
            .where(eq(asset.type, type))
            .orderBy(desc(asset.createdAt))

        return results
    } catch (e: any) {
        console.error('List assets error:', e)
        throw createError({ statusCode: 500, message: 'Erreur lors de la récupération des fichiers' })
    }
})

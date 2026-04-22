import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '../../utils/db'
import { spamFilter } from '../../../drizzle/src/db/schema'
import { and, eq } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })
    
    const body = await readBody(event)
    const { id } = body

    if (!id) {
        throw createError({ statusCode: 400, message: 'ID is required' })
    }

    try {
        await db.delete(spamFilter)
            .where(and(
                eq(spamFilter.id, id),
                eq(spamFilter.userId, session.user.id)
            ))
            
        return { success: true }
    } catch (e: any) {
        throw createError({ statusCode: 500, message: e.message })
    }
})

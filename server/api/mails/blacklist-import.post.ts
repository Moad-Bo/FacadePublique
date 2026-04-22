import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '../../utils/db'
import { spamFilter } from '../../../drizzle/src/db/schema'
import { requireUserSession } from '../../utils/auth'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })
    
    const body = await readBody(event)
    const { list } = body

    if (!list || !Array.isArray(list)) {
        throw createError({ statusCode: 400, message: 'Invalid blacklist data' })
    }

    try {
        // Insert each email from the list
        for (const item of list) {
            const email = typeof item === 'string' ? item : (item.email || item.fromEmail)
            if (!email) continue

            // Use onDuplicateKeyUpdate or similar if we want to avoid errors, 
            // but since we removed unique constraint, we just insert.
            // We should check if it already exists to avoid duplicates for the same user.
            await db.insert(spamFilter).values({
                id: uuidv4(),
                userId: session.user.id,
                email: email,
                reason: item.reason || 'Imported from backup'
            })
        }
            
        return { success: true }
    } catch (e: any) {
        throw createError({ statusCode: 500, message: e.message })
    }
})

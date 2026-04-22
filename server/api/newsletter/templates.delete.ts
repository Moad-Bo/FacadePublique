import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '../../utils/db'
import { newsletterTemplate } from '../../../drizzle/src/db/schema'
import { eq } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_newsletter' })
    
    const body = await readBody(event)
    const { id } = body

    if (!id) {
        throw createError({ statusCode: 400, message: 'ID is required' })
    }

    try {
        await db.delete(newsletterTemplate).where(eq(newsletterTemplate.id, id))
        return { success: true }
    } catch (e: any) {
        console.error('Delete template error:', e)
        return { success: false, error: e.message }
    }
})

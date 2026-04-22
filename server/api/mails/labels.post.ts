import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '../../utils/db'
import { mailboxLabel } from '../../../drizzle/src/db/schema'
import { eq } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'
import { randomUUID } from 'crypto'

const LABEL_COLORS = ['primary', 'success', 'warning', 'error', 'info', 'neutral']

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })
    const userId = (session as any).user?.id

    const body = await readBody(event)
    const { action, id, name, color } = body

    try {
        if (action === 'create') {
            if (!name?.trim()) throw createError({ statusCode: 400, message: 'Name is required' })
            await db.insert(mailboxLabel).values({
                id: randomUUID(),
                userId,
                name: name.trim(),
                color: LABEL_COLORS.includes(color) ? color : 'primary'
            })
            return { success: true }
        }
        else if (action === 'delete') {
            if (!id) throw createError({ statusCode: 400, message: 'ID is required' })
            await db.delete(mailboxLabel).where(eq(mailboxLabel.id, id))
            return { success: true }
        }
        else if (action === 'update') {
            if (!id) throw createError({ statusCode: 400, message: 'ID is required' })
            await db.update(mailboxLabel)
                .set({ 
                    name: name?.trim() || undefined,
                    color: LABEL_COLORS.includes(color) ? color : undefined
                })
                .where(eq(mailboxLabel.id, id))
            return { success: true }
        }

        throw createError({ statusCode: 400, message: 'Unknown action' })
    } catch (e: any) {
        throw createError({ statusCode: 500, message: e.message })
    }
})

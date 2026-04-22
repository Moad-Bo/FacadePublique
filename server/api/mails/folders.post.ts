import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '../../utils/db'
import { mailboxFolder } from '../../../drizzle/src/db/schema'
import { eq } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })
    const userId = (session as any).user?.id

    const body = await readBody(event)
    const { action, id, name, icon, color } = body

    try {
        if (action === 'create') {
            if (!name?.trim()) throw createError({ statusCode: 400, message: 'Name is required' })
            await db.insert(mailboxFolder).values({
                id: randomUUID(),
                userId,
                name: name.trim(),
                icon: icon || 'i-lucide:folder',
                color: color || 'neutral'
            })
            return { success: true }
        }
        else if (action === 'update') {
            if (!id) throw createError({ statusCode: 400, message: 'ID is required' })
            await db.update(mailboxFolder)
                .set({ 
                    name: name?.trim() || undefined,
                    color: color || undefined,
                    icon: icon || undefined
                })
                .where(eq(mailboxFolder.id, id))
            return { success: true }
        }
        else if (action === 'delete') {
            if (!id) throw createError({ statusCode: 400, message: 'ID is required' })
            await db.delete(mailboxFolder).where(eq(mailboxFolder.id, id))
            return { success: true }
        }
        else if (action === 'rename') {
            if (!id || !name?.trim()) throw createError({ statusCode: 400, message: 'ID and name are required' })
            await db.update(mailboxFolder).set({ name: name.trim() }).where(eq(mailboxFolder.id, id))
            return { success: true }
        }

        throw createError({ statusCode: 400, message: 'Unknown action' })
    } catch (e: any) {
        throw createError({ statusCode: 500, message: e.message })
    }
})

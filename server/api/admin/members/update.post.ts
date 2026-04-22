import { defineEventHandler, createError } from 'h3'
import { db } from '../../../utils/db'
import { audience, user } from '../../../../drizzle/src/db/schema'
import { eq } from 'drizzle-orm'
import { requireUserSession } from '../../../utils/auth'
import { validateBody } from '../../../utils/validation'
import { z } from 'zod'

const updateMemberSchema = z.object({
    id: z.string().min(1),
    action: z.enum(['update', 'delete']),
    isGuest: z.boolean(), // true = audience (newsletterSubscriber), false = user table
    data: z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        status: z.string().optional(),
        // cookieChoice/contactInfo removed as they are not in the new audience schema
    }).optional()
})

export default defineEventHandler(async (event) => {
    // 1. Security Check
    await requireUserSession(event, { permission: 'manage_membre' })

    // 2. Validate Body
    const { id, action, isGuest, data } = await validateBody(event, updateMemberSchema)

    try {
        if (action === 'delete') {
            if (isGuest) {
                await db.delete(audience).where(eq(audience.id, id))
            } else {
                // For safety, we only delete if it's a 'membre' role
                const target = await db.select({ role: user.role }).from(user).where(eq(user.id, id)).limit(1)
                if (target[0]?.role !== 'membre') {
                    throw createError({ statusCode: 403, statusMessage: "Interdit: Cet utilisateur n'est pas un membre." })
                }
                await db.delete(user).where(eq(user.id, id))
            }
            return { success: true, message: "Membre supprimé avec succès." }
        }

        if (action === 'update' && data) {
            if (isGuest) {
                const updateData: any = {}
                if (data.email) updateData.email = data.email
                
                if (data.status === 'subscribed') {
                    updateData.optInNewsletter = true
                    updateData.unsubscribedAt = null
                } else if (data.status === 'unsubscribed') {
                    updateData.optInNewsletter = false
                    updateData.unsubscribedAt = new Date()
                }

                await db.update(audience)
                    .set(updateData)
                    .where(eq(audience.id, id))
            } else {
                await db.update(user)
                    .set({
                        name: data.name,
                        email: data.email,
                        // Banning/Unbanning for users
                        banned: data.status === 'banned' ? true : data.status === 'active' ? false : undefined,
                    })
                    .where(eq(user.id, id))
            }
            return { success: true, message: "Membre mis à jour avec succès." }
        }

        return { success: false, message: "Aucune action effectuée." }
    } catch (e: any) {
        console.error('[API] Member Update Error:', e.message)
        throw createError({
            statusCode: 500,
            statusMessage: e.statusMessage || 'Erreur lors de la modification du membre.'
        })
    }
})

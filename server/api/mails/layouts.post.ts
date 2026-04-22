import { defineEventHandler, createError } from 'h3'
import { db } from '../../utils/db'
import { emailLayout } from '../../../drizzle/src/db/schema'
import { eq } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'
import { validateBody } from '../../utils/validation'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const layoutSchema = z.object({
    id: z.string().optional(),
    action: z.enum(['create', 'update', 'delete', 'set-default']).optional().default('update'),
    name: z.string().min(1, 'Le nom est requis').optional(),
    html: z.string().min(1, 'Le HTML est requis').optional(),
    category: z.enum(['system', 'newsletter', 'contact', 'notification', 'mod-forum', 'content_layout']).optional(),
    description: z.string().optional(),
})

export default defineEventHandler(async (event) => {
    // Both mail managers and newsletter managers can edit layouts
    await requireUserSession(event, { permission: ['manage_mail', 'manage_newsletter'] })
    
    try {
        const body = await validateBody(event, layoutSchema)
        const { action, id, name, html, category, description } = body

        // 1. UPDATE
        if (action === 'update') {
            if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requis pour la mise à jour' })
            await db.update(emailLayout)
                .set({
                    ...(name ? { name } : {}),
                    ...(html !== undefined ? { html } : {}),
                    ...(category ? { category } : {}),
                    ...(description !== undefined ? { description } : {}),
                })
                .where(eq(emailLayout.id, id))
            return { success: true }
        }

        // 2. CREATE
        if (action === 'create') {
            if (!name || !html) throw createError({ statusCode: 400, statusMessage: 'Nom et HTML requis pour la création' })
            const newId = randomUUID()
            await db.insert(emailLayout).values({
                id: newId,
                name,
                html: html || '<div>{{{body}}}</div>',
                category: category || 'contact',
                description: description || null,
                isDefault: false,
            })
            return { success: true, id: newId }
        }

        // 3. SET DEFAULT
        if (action === 'set-default') {
            if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requis' })
            
            // Get the category of this layout
            const [layout] = await db.select({ category: emailLayout.category })
                .from(emailLayout).where(eq(emailLayout.id, id))
            
            if (!layout) throw createError({ statusCode: 404, statusMessage: 'Layout introuvable' })
            
            // 1. Reset all layouts in this category
            await db.update(emailLayout)
                .set({ isDefault: false })
                .where(eq(emailLayout.category, layout.category))
            
            // 2. Set this one as default
            await db.update(emailLayout)
                .set({ isDefault: true })
                .where(eq(emailLayout.id, id))
            
            return { success: true }
        }

        // 4. DELETE
        if (action === 'delete') {
            if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requis pour la suppression' })
            // Protect default layouts
            const [existing] = await db.select({ isDefault: emailLayout.isDefault })
                .from(emailLayout).where(eq(emailLayout.id, id))
            if (existing?.isDefault) throw createError({ statusCode: 403, statusMessage: 'Impossible de supprimer un layout par défaut' })
            await db.delete(emailLayout).where(eq(emailLayout.id, id))
            return { success: true }
        }

        throw createError({ statusCode: 400, statusMessage: 'Action inconnue' })
    } catch (e: any) {
        if (e.statusCode) throw e
        throw createError({ 
            statusCode: 500, 
            statusMessage: e.message || 'Erreur lors de la manipulation du layout' 
        })
    }
})

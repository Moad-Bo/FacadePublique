import { defineEventHandler, createError } from 'h3'
import { db } from '../../utils/db'
import { campaignTemplate } from '../../../drizzle/src/db/schema'
import { eq } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'
import { validateBody } from '../../utils/validation'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const templateSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Le nom est requis'),
    subject: z.string().min(1, 'L\'objet est requis'),
    content: z.string().min(1, 'Le contenu est requis'),
    icon: z.string().optional(),
    description: z.string().optional(),
    layoutId: z.string().optional().default('campaign'),
    category: z.string().optional(),
})

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_campaign' })
    
    try {
        const body = await validateBody(event, templateSchema)
        const { id, name, subject, content, icon, description, layoutId } = body

        if (id) {
            // Update
            await db.update(campaignTemplate)
                .set({ 
                    name, 
                    subject, 
                    content, 
                    icon: icon || 'i-lucide:mail', 
                    description,
                    layoutId: layoutId || 'campaign',
                    updatedAt: new Date()
                })
                .where(eq(campaignTemplate.id, id))
            
            return { success: true, id }
        } else {
            // Create
            const newId = randomUUID()
            await db.insert(campaignTemplate).values({
                id: newId,
                name,
                subject,
                content,
                icon: icon || 'i-lucide:mail',
                description,
                layoutId: layoutId || 'campaign',
                createdAt: new Date(),
                updatedAt: new Date()
            })
            
            return { success: true, id: newId }
        }
    } catch (e: any) {
        console.error('Save template error:', e)
        throw createError({
            statusCode: 400,
            statusMessage: e.message || 'Erreur lors de la sauvegarde du template'
        })
    }
})

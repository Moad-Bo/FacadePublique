import { defineEventHandler, createError } from 'h3'
import { db } from '../../utils/db'
import { newsletterTemplate } from '../../../drizzle/src/db/schema'
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
})

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_newsletter' })
    
    try {
        const body = await validateBody(event, templateSchema)
        const { id, name, subject, content, icon, description } = body

        if (id) {
            // Update
            await db.update(newsletterTemplate)
                .set({ 
                    name, 
                    subject, 
                    content, 
                    icon: icon || 'i-lucide:mail', 
                    description,
                    updatedAt: new Date()
                })
                .where(eq(newsletterTemplate.id, id))
            
            return { success: true, id }
        } else {
            // Create
            const newId = randomUUID()
            await db.insert(newsletterTemplate).values({
                id: newId,
                name,
                subject,
                content,
                icon: icon || 'i-lucide:mail',
                description,
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

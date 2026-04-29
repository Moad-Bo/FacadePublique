import { defineEventHandler, readBody, createError } from 'h3'
import { mailService } from '../../services/mail.service'
import { requireUserSession } from '../../utils/auth'
import { MailActionSchema } from '../../utils/schemas'

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })
    
    // Validation du corps de la requête via Zod
    let body;
    try {
        body = await readValidatedBody(event, MailActionSchema.parse)
    } catch (e: any) {
        throw createError({ 
            statusCode: 400, 
            message: 'Validation failed: ' + e.message 
        })
    }

    try {
        // Délégation de toute la logique métier au service
        return await mailService.performActions(session.user.id, body)
    } catch (e: any) {
        console.error(`[API Actions] Error performing ${body.action}:`, e.message)
        throw createError({ 
            statusCode: 500, 
            message: e.message || 'Internal Server Error during mail action' 
        })
    }
})

import { defineEventHandler, createError } from 'h3'
import { db } from '../../utils/db'
import { newsletterCampaign, audience } from '../../../drizzle/src/db/schema'
import { eq, or } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'
import { scheduleEmail } from '../../utils/scheduler'
import { validateBody } from '../../utils/validation'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const campaignSchema = z.object({
    id: z.string().optional(),
    action: z.enum(['publish', 'draft']).optional().default('publish'),
    templateId: z.string().optional(),
    name: z.string().min(1, 'Le nom est requis'),
    subject: z.string().min(1, 'L\'objet est requis'),
    content: z.string().min(1, 'Le contenu est requis'),
    scheduledAt: z.string().optional(),
    recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).optional().default('none'),
    recurrenceValue: z.string().optional(),
    timezone: z.string().optional().default('Europe/Paris'),
    layoutId: z.string().optional().default('newsletter'),
    layoutId: z.string().optional().default('newsletter'),
    contentLayoutId: z.string().optional(),
    fromContext: z.string().optional().default('Newsletter'),
})

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_newsletter' })
    
    try {
        const body = await validateBody(event, campaignSchema)
        const { id, action, templateId, subject, content, name, scheduledAt, recurrence, recurrenceValue, timezone, layoutId, contentLayoutId, fromContext } = body

        let campaignId = id || randomUUID()
        const resolvedScheduledAt = scheduledAt ? new Date(scheduledAt) : new Date()
        const isFutureScheduled = scheduledAt && resolvedScheduledAt.getTime() > Date.now()

        // 1. CREATE OR UPDATE RECORD
        if (id) {
            await db.update(newsletterCampaign)
                .set({
                    name,
                    templateId,
                    subject,
                    content,
                    layoutId,
                    contentLayoutId,
                    fromContext,
                    status: action === 'draft' ? 'draft' : (isFutureScheduled ? 'scheduled' : 'sending'),
                })
                .where(eq(newsletterCampaign.id, id))
        } else {
            await db.insert(newsletterCampaign).values({
                id: campaignId,
                name,
                templateId,
                subject,
                content,
                layoutId,
                contentLayoutId,
                fromContext,
                status: action === 'draft' ? 'draft' : (isFutureScheduled ? 'scheduled' : 'sending'),
                totalRecipients: 0,
                createdAt: new Date()
            })
        }

        // 2. IF PUBLISHING -> QUEUE EMAILS
        if (action === 'publish') {
            // Get all active subscribers from Audience (Single Source of Truth)
            const subscribers = await db.select()
                .from(audience)
                .where(
                    or(
                        eq(audience.optInNewsletter, true),
                        eq(audience.optInMarketing, true)
                    )
                )
            
            if (subscribers.length === 0) {
                return { success: false, error: 'Aucun abonné actif trouvé.' }
            }

            await db.transaction(async (tx) => {
                // If it was already scheduled, clear previous queue for this campaign
                // emailQueue.template field is used to store campaignId (as per current code line 62 in original)
                // Actually, line 185 in schema says 'template' is a string.
                const { emailQueue } = await import('../../../drizzle/src/db/schema');
                const { and } = await import('drizzle-orm');
                
                await tx.delete(emailQueue).where(
                    and(
                        eq(emailQueue.template, campaignId),
                        eq(emailQueue.status, 'pending')
                    )
                );

                // Update total recipients
                await tx.update(newsletterCampaign)
                    .set({ 
                        totalRecipients: subscribers.length,
                        sentAt: isFutureScheduled ? null : new Date()
                    })
                    .where(eq(newsletterCampaign.id, campaignId));

                // Queue emails individually
                for (const sub of subscribers) {
                    await scheduleEmail({
                        recipient: sub.email,
                        subject,
                        html: content,
                        type: 'newsletter',
                        template: campaignId,
                        scheduledAt: resolvedScheduledAt,
                        timezone: timezone || "Europe/Paris",
                        layoutId: layoutId || "newsletter",
                        fromContext
                    })
                }
            });

            return { 
                success: true, 
                campaignId, 
                status: isFutureScheduled ? 'scheduled' : 'sending',
                queuedRecipients: subscribers.length,
                scheduledAt: resolvedScheduledAt
            }
        }

        // 3. IF DRAFT -> JUST RETURN SUCCESS
        return {
            success: true,
            campaignId,
            status: 'draft'
        }

    } catch (e: any) {
        console.error('Campaign process error:', e)
        throw createError({
            statusCode: 400,
            statusMessage: e.message || 'Erreur lors du traitement de la campagne'
        })
    }
})

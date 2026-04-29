import { defineEventHandler, createError } from 'h3'
import { db } from '../../utils/db'
import { campaign, audience, emailQueue } from '../../../drizzle/src/db/schema'
import { eq, or, and } from 'drizzle-orm'
import { requireUserSession } from '../../utils/auth'
import { sendBatchCampaign } from '../../utils/email'
import { EmailContext } from '../../utils/email-router'
import { validateBody } from '../../utils/validation'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { processMentions } from '../../utils/mentions'

const campaignSchema = z.object({
    id: z.string().optional(),
    action: z.enum(['publish', 'draft']).optional().default('publish'),
    templateId: z.string().optional(),
    name: z.string().optional(),
    subject: z.string().min(1, 'L\'objet est requis'),
    content: z.string().min(1, 'Le contenu est requis'),
    scheduledAt: z.string().optional(),
    recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).optional().default('none'),
    recurrenceValue: z.string().optional(),
    timezone: z.string().optional().default('Europe/Paris'),
    layoutId: z.string().optional().default('campaign'),
    contentLayoutId: z.string().optional(),
    fromContext: z.string().optional().default('Newsletter'),
    // Type de campagne — détermine l'alias expéditeur et les règles d'opt-in
    campaignType: z.enum([
        'campaign_newsletter',  // EmailContext.CAMPAIGN_NEWSLETTER
        'campaign_changelog',   // EmailContext.CAMPAIGN_CHANGELOG
        'campaign_promo',       // EmailContext.CAMPAIGN_PROMO
    ]).optional().default('campaign_newsletter'),
})

export default defineEventHandler(async (event) => {
    const { user } = await requireUserSession(event, { permission: 'manage_campaign' })

    try {
        const body = await validateBody(event, campaignSchema)
        const { id, action, templateId, subject, content, scheduledAt, recurrence, recurrenceValue, timezone, layoutId, contentLayoutId, fromContext } = body

        const name = body.name || `Campagne - ${fromContext} - ${new Date().toLocaleDateString('fr-FR')}`
        const campaignId = id || randomUUID()
        const resolvedScheduledAt = scheduledAt ? new Date(scheduledAt) : new Date()
        // Marge de 30s : en dessous, on considère l'envoi comme immédiat
        const isFutureScheduled = scheduledAt && resolvedScheduledAt.getTime() > Date.now() + 30_000

        // ─── 1. Création ou mise à jour de l'enregistrement campagne ─────────
        if (id) {
            await db.update(campaign)
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
                .where(eq(campaign.id, id))
        } else {
            await db.insert(campaign).values({
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

        // ─── 2. Publication ────────────────────────────────────────────────────
        if (action === 'publish') {

            await processMentions(content, {
                authorName: user.name,
                authorEmail: user.email,
                contextUrl: `/dashboard/com/campaigns/${campaignId}`
            })

            // Audience nécessaire dans les deux chemins (compteur + envoi immédiat)
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

            await db.update(campaign)
                .set({ totalRecipients: subscribers.length })
                .where(eq(campaign.id, campaignId))

            // ── CHEMIN A : Envoi immédiat ──────────────────────────────────────
            if (!isFutureScheduled) {
                const batchResult = await sendBatchCampaign({
                    context:      body.campaignType || EmailContext.CAMPAIGN_NEWSLETTER,
                    subject,
                    htmlTemplate: content,
                    subscribers,
                    campaignId
                })

                await db.update(campaign)
                    .set({ sentAt: new Date(), status: 'sent' })
                    .where(eq(campaign.id, campaignId))

                if (!batchResult.success && batchResult.sent === 0) {
                    console.error(`[Campaign] Batch échoué pour ${campaignId}:`, batchResult.error)
                } else {
                    console.info(`[Campaign] ✅ ${campaignId}: ${batchResult.sent} envoi(s) en ${batchResult.chunks} chunk(s).`)
                }

                return {
                    success: true,
                    campaignId,
                    status: 'sent',
                    sentRecipients: batchResult.sent,
                    chunks: batchResult.chunks,
                }
            }

            // ── CHEMIN B : Planification différée (1 seule ligne en DB) ─────────
            // Annule les éventuels batches déjà planifiés pour cette campagne
            await db.delete(emailQueue).where(
                and(
                    eq(emailQueue.template, campaignId),
                    eq(emailQueue.type, 'campaign_batch' as any),
                    eq(emailQueue.status, 'pending')
                )
            )

            // 1 seule ligne en DB — le scheduler appellera sendBatchCampaign au bon moment
            const queueId = randomUUID()
            await db.insert(emailQueue).values({
                id:              queueId,
                recipient:       '__batch__',        // Sentinelle : pas d'envoi individuel
                subject,
                html:            content,
                type:            'campaign_batch' as any,
                fromContext:     body.campaignType || EmailContext.CAMPAIGN_NEWSLETTER,
                template:        campaignId,          // Référence campagne parente
                status:          'pending',
                scheduledAt:     resolvedScheduledAt,
                recurrence:      recurrence || 'none',
                recurrenceValue: recurrenceValue,
                timezone:        timezone || 'Europe/Paris',
                layoutId,
                createdAt:       new Date(),
                updatedAt:       new Date()
            })

            console.info(`[Campaign] 📅 Campagne ${campaignId} planifiée pour le ${resolvedScheduledAt.toISOString()} (${subscribers.length} destinataires)`)

            return {
                success: true,
                campaignId,
                queueId,
                status: 'scheduled',
                scheduledAt: resolvedScheduledAt,
                plannedRecipients: subscribers.length,
            }
        }

        // ─── 3. Brouillon ──────────────────────────────────────────────────────
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

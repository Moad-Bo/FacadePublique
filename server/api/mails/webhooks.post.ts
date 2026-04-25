import { defineEventHandler, readBody, createError } from 'h3';
import { db } from '../../utils/db';
import { emailLog, campaign, spamFilter, audience } from '../../../drizzle/src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { verifyMailgunSignature, extractMailgunSignature } from '../../utils/mailgun-verify';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    // ─── ÉTAPE 0 : Vérification de la signature Mailgun (Sécurité Critique) ───
    const sigPayload = extractMailgunSignature(body);

    if (!sigPayload) {
        console.warn('[Webhook] Payload de signature Mailgun absent ou malformé. Requête rejetée.');
        throw createError({ statusCode: 401, statusMessage: 'Missing Mailgun signature payload' });
    }

    const { valid, reason } = verifyMailgunSignature(sigPayload);
    if (!valid) {
        console.warn(`[Webhook] Signature invalide: ${reason}. IP: ${event.node.req.socket?.remoteAddress}`);
        throw createError({ statusCode: 401, statusMessage: `Unauthorized: ${reason}` });
    }

    // ─── ÉTAPE 1 : Extraction des données de l'événement ─────────────────────
    const eventData = body['event-data'];
    if (!eventData) return { success: false, error: 'No event data' };

    const eventType = eventData.event as string;
    const recipient = (eventData.recipient as string)?.toLowerCase();
    const messageId = eventData.message?.headers?.['message-id']?.replace(/[<>]/g, '');

    console.log(`[Webhook] ✅ Signature OK. Traitement: ${eventType} pour ${recipient}`);

    try {
        // ─── PHASE A : Gestion de la Réputation & Feedback Loop ──────────────

        // 1. Bounce permanent → blacklist + désabonnement complet
        if (eventType === 'failed' && eventData.severity === 'permanent') {
            const bounceReason = `Mailgun Permanent Failure: ${eventData['delivery-status']?.description || 'Unknown bounce'}`;
            console.warn(`[Webhook][Blacklist] Bounce permanent pour ${recipient}: ${bounceReason}`);

            await db.insert(spamFilter).values({
                id: randomUUID(),
                email: recipient,
                reason: bounceReason,
            }).onDuplicateKeyUpdate({ set: { reason: bounceReason } }); // Mise à jour de la raison

            await db.update(audience)
                .set({ optInNewsletter: false, optInMarketing: false, unsubscribedAt: new Date() })
                .where(eq(audience.email, recipient));
        }

        // 2. Plainte SPAM → blacklist + désabonnement
        if (eventType === 'complained') {
            console.warn(`[Webhook][Spam] Plainte SPAM de ${recipient}. Désabonnement immédiat.`);

            await db.insert(spamFilter).values({
                id: randomUUID(),
                email: recipient,
                reason: 'Mailgun Spam Complaint',
            }).onDuplicateKeyUpdate({ set: { reason: 'Mailgun Spam Complaint (repeated)' } });

            await db.update(audience)
                .set({ optInNewsletter: false, optInMarketing: false, unsubscribedAt: new Date() })
                .where(eq(audience.email, recipient));
        }

        // 3. Désinscription volontaire
        if (eventType === 'unsubscribed') {
            console.log(`[Webhook][Unsubscribe] ${recipient} s'est désabonné.`);
            await db.update(audience)
                .set({ optInNewsletter: false, optInMarketing: false, unsubscribedAt: new Date() })
                .where(eq(audience.email, recipient));
        }

        // ─── PHASE B : Mise à jour du Log & Métriques Campagne ───────────────
        if (messageId) {
            const [log] = await db.select()
                .from(emailLog)
                .where(eq(emailLog.messageId, messageId))
                .limit(1);

            if (log) {
                // Mise à jour du statut du log
                await db.update(emailLog)
                    .set({ status: eventType })
                    .where(eq(emailLog.id, log.id));

                // Mise à jour des métriques de campagne si applicable
                if (log.campaignId) {
                    if (eventType === 'delivered') {
                        await db.update(campaign)
                            .set({ deliveredCount: sql`${campaign.deliveredCount} + 1` })
                            .where(eq(campaign.id, log.campaignId));
                    } else if (eventType === 'failed' || eventType === 'bounced') {
                        await db.update(campaign)
                            .set({ failedCount: sql`${campaign.failedCount} + 1` })
                            .where(eq(campaign.id, log.campaignId));
                    } else if (eventType === 'opened') {
                        await db.update(campaign)
                            .set({ openedCount: sql`${campaign.openedCount} + 1` })
                            .where(eq(campaign.id, log.campaignId));
                    } else if (eventType === 'clicked') {
                        await db.update(campaign)
                            .set({ clickedCount: sql`${campaign.clickedCount} + 1` })
                            .where(eq(campaign.id, log.campaignId));
                    }
                }
            } else {
                console.warn(`[Webhook] Aucun log trouvé pour messageId: ${messageId}`);
            }
        }

    } catch (e: any) {
        console.error('[Webhook] Erreur de traitement:', e.message || e);
        // On retourne 200 quand même pour éviter que Mailgun ne re-poste en boucle
        // (Mailgun réessaie les webhooks qui retournent du != 200)
        return { success: false, error: e.message };
    }

    return { success: true };
});

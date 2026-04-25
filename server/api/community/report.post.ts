/**
 * server/api/forum/report.post.ts
 *
 * 🚨 POST /api/forum/report
 *
 * Endpoint de signalement (Report) des contenus du forum.
 * Alimente la `moderation_log` et notifie le rôle 'moderator' via SSE.
 *
 * Body:
 *   targetType: 'thread' | 'reply'
 *   targetId: string
 *   reason: 'spam' | 'harassment' | 'misinformation' | 'other'
 *   details?: string
 */

import { defineEventHandler, readBody, createError } from 'h3';
import { requireUserSession } from '../../utils/auth';
import { db } from '../../utils/db';
import { moderationLog, communityTopic, communityReply } from '../../../drizzle/src/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { notify } from '../../utils/notify';
import { z } from 'zod';

const reportSchema = z.object({
  targetType: z.enum(['thread', 'reply']),
  targetId: z.string().uuid(),
  reason: z.enum(['spam', 'harassment', 'misinformation', 'other']),
  details: z.string().max(500).optional(),
});

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event, { permission: 'community-access' });
  const userId = session.user.id;

  const body = await readBody(event);
  const validated = reportSchema.safeParse(body);

  if (!validated.success) {
    throw createError({ statusCode: 400, statusMessage: 'Données invalides', data: validated.error.format() });
  }

  const { targetType, targetId, reason, details } = validated.data;

  // 1. Vérifier que la cible existe
  if (targetType === 'thread') {
    const t = await db.select({ id: communityTopic.id }).from(communityTopic).where(eq(communityTopic.id, targetId)).limit(1);
    if (!t.length) throw createError({ statusCode: 404, statusMessage: 'Thread non trouvé' });
  } else {
    const r = await db.select({ id: communityReply.id }).from(communityReply).where(eq(communityReply.id, targetId)).limit(1);
    if (!r.length) throw createError({ statusCode: 404, statusMessage: 'Réponse non trouvée' });
  }

  // 2. Insérer le signalement
  const logId = randomUUID();
  await db.insert(moderationLog).values({
    id: logId,
    reportedBy: userId,
    targetType,
    targetId,
    reason,
    details: details || null,
    status: 'pending',
    createdAt: new Date(),
  });

  // 3. Marquer le contenu comme signalé (flag is_reported)
  if (targetType === 'thread') {
    await db.update(communityTopic).set({ isReported: true }).where(eq(communityTopic.id, targetId));
  } else {
    await db.update(communityReply).set({ isReported: true }).where(eq(communityReply.id, targetId));
  }

  // 4. Notifier les modérateurs (SSE In-App)
  const reasonLabels: Record<string, string> = {
    spam: '🗑️ Spam',
    harassment: '⚠️ Harcèlement',
    misinformation: '❌ Désinformation',
    other: '🔍 Autre',
  };

  await notify.permission('support:chat', {
    type: 'moderation_alert',
    title: `Signalement : ${reasonLabels[reason]}`,
    body: `Un ${targetType === 'thread' ? 'sujet' : 'message'} a été signalé`,
    actionUrl: `/dashboard/moderation`,
  });

  return { success: true, logId };
});

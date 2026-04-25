/**
 * server/api/admin/moderation/[id].post.ts
 *
 * ✅ POST /api/admin/moderation/:id
 *
 * Action sur un signalement : resolve ou dismiss.
 *
 * Body: { action: 'resolve' | 'dismiss' }
 *
 * Effets :
 *   - resolve : Marque le log comme résolu + notifie l'auteur du contenu
 *   - dismiss  : Marque comme non-pertinent + réinitialise le flag is_reported
 */

import { defineEventHandler, readBody, createError, getRouterParam } from 'h3';
import { requireUserSession } from '../../../utils/auth';
import { db } from '../../../utils/db';
import { moderationLog, communityTopic, communityReply, user } from '../../../../drizzle/src/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { notify } from '../../../utils/notify';

const actionSchema = z.object({
  action: z.enum(['resolve', 'dismiss']),
  note: z.string().max(500).optional(),
});

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event, { permission: 'support:chat' });
  const moderatorId = session.user.id;
  const logId = getRouterParam(event, 'id');

  if (!logId) throw createError({ statusCode: 400, statusMessage: 'ID requis' });

  const body = await readBody(event);
  const validated = actionSchema.safeParse(body);
  if (!validated.success) {
    throw createError({ statusCode: 400, statusMessage: 'Action invalide', data: validated.error.format() });
  }

  const { action } = validated.data;

  // Récupérer le log
  const [log] = await db.select().from(moderationLog).where(eq(moderationLog.id, logId)).limit(1);
  if (!log) throw createError({ statusCode: 404, statusMessage: 'Signalement non trouvé' });
  if (log.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Ce signalement a déjà été traité' });
  }

  // Mettre à jour le log
  const newStatus = action === 'resolve' ? 'resolved' : 'dismissed';
  await db.update(moderationLog).set({
    status: newStatus,
    resolvedBy: moderatorId,
    resolvedAt: new Date(),
  }).where(eq(moderationLog.id, logId));

  // ── Action sur le contenu signalé ─────────────────────────────────────────
  let contentAuthorId: string | null = null;

  if (log.targetType === 'topic') {
    const [thread] = await db.select({ authorId: communityTopic.authorId })
      .from(communityTopic).where(eq(communityTopic.id, log.targetId)).limit(1);
    
    if (thread) {
      contentAuthorId = thread.authorId;
      // Si résolu → masquer le thread pour review (closed), si dismissed → réinitialiser le flag
      if (action === 'resolve') {
        await db.update(communityTopic).set({ status: 'closed', isReported: false }).where(eq(communityTopic.id, log.targetId));
      } else {
        await db.update(communityTopic).set({ isReported: false }).where(eq(communityTopic.id, log.targetId));
      }
    }
  } else if (log.targetType === 'reply') {
    const [reply] = await db.select({ authorId: communityReply.authorId })
      .from(communityReply).where(eq(communityReply.id, log.targetId)).limit(1);
    
    if (reply) {
      contentAuthorId = reply.authorId;
      // Réinitialiser le flag dans tous les cas
      await db.update(communityReply).set({ isReported: false }).where(eq(communityReply.id, log.targetId));
    }
  }

  // ── Notification à l'auteur du contenu traité ─────────────────────────────
  if (contentAuthorId && action === 'resolve') {
    await notify.user(contentAuthorId, {
      type: 'moderation_alert',
      title: 'Votre contenu a été examiné par la modération',
      body: `Suite à un signalement, votre ${log.targetType === 'topic' ? 'sujet' : 'réponse'} a été retiré(e).`,
      actionUrl: '/community',
    });
  }

  return { success: true, logId, status: newStatus };
});

/**
 * server/api/forum/threads/[id].patch.ts
 *
 * ✅ PATCH /api/forum/threads/:id
 *
 * Permet de mettre à jour l'état d'un thread :
 *  - isResolved: true/false → Marquer comme résolu (Stack Overflow style)
 *  - isSticky: true/false   → Épingler (admin/support uniquement)
 *  - status: 'open'|'closed'|'archived' → Changer le statut
 *
 * Règles :
 *  - L'auteur peut marquer son propre thread comme résolu
 *  - Seul le support/admin peut fermer, archiver ou épingler
 *  - Notification envoyée à l'auteur quand une reply est marquée solution (appelé depuis votes/replies)
 */

import { defineEventHandler, readBody, createError, getRouterParam } from 'h3';
import { requireUserSession } from '../../../utils/auth';
import { db } from '../../../utils/db';
import { communityTopic } from '../../../../drizzle/src/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { notify } from '../../../utils/notify';

const patchSchema = z.object({
  isResolved: z.boolean().optional(),
  isSticky: z.boolean().optional(),
  status: z.enum(['open', 'closed', 'archived']).optional(),
});

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event, { permission: 'community-access' });
  const userId = session.user.id;
  const userRole = session.user.role;
  const topicId = getRouterParam(event, 'id');

  if (!topicId) throw createError({ statusCode: 400, statusMessage: 'ID du thread requis' });

  const body = await readBody(event);
  const validated = patchSchema.safeParse(body);
  if (!validated.success) {
    throw createError({ statusCode: 400, statusMessage: 'Données invalides', data: validated.error.format() });
  }

  const { isResolved, isSticky, status } = validated.data;

  // Récupérer le thread original
  const [thread] = await db.select().from(communityTopic).where(eq(communityTopic.id, topicId)).limit(1);
  if (!thread) throw createError({ statusCode: 404, statusMessage: 'Thread non trouvé' });

  // ── Vérifications des droits ───────────────────────────────────────────────
  const isAdmin = userRole === 'admin';
  const isSupport = userRole === 'support' || (session.user.permissions || '').includes('support:chat');
  const isAuthor = thread.authorId === userId;

  // isSticky et status :  support/admin uniquement
  if ((isSticky !== undefined || (status && status !== 'open')) && !isAdmin && !isSupport) {
    throw createError({ statusCode: 403, statusMessage: 'Permission insuffisante pour cette action' });
  }

  // isResolved : auteur OU support/admin
  if (isResolved !== undefined && !isAuthor && !isAdmin && !isSupport) {
    throw createError({ statusCode: 403, statusMessage: 'Seul l\'auteur peut marquer son sujet comme résolu' });
  }

  // ── Mise à jour ────────────────────────────────────────────────────────────
  const updatePayload: Partial<typeof communityTopic.$inferInsert> = {};
  if (isResolved !== undefined) updatePayload.isResolved = isResolved;
  if (isSticky !== undefined) updatePayload.isSticky = isSticky;
  if (status) updatePayload.status = status;

  await db.update(communityTopic).set(updatePayload).where(eq(communityTopic.id, topicId));

  // ── Notification : si résolution par support, prévenir l'auteur ────────────
  if (isResolved === true && !isAuthor) {
    await notify.user(thread.authorId as string, {
      type: 'ticket_resolved',
      title: 'Votre sujet a été marqué comme résolu',
      body: thread.title as string,
      actionUrl: `/forum/${thread.slug}`,
    });
  }

  return { success: true, topicId, updated: updatePayload };
});

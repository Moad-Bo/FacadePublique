/**
 * server/api/admin/moderation/index.get.ts
 *
 * 📋 GET /api/admin/moderation
 *
 * Liste la file de modération (signalements en attente).
 * Protégé par la permission 'support:chat'.
 *
 * Query params :
 *   ?status=pending|resolved|dismissed  (défaut: pending)
 *   ?targetType=thread|reply            (optionnel)
 *   ?page=1&limit=20                    (pagination)
 */

import { defineEventHandler, getQuery } from 'h3';
import { requireUserSession } from '../../../utils/auth';
import { db } from '../../../utils/db';
import { moderationLog, user, communityTopic, communityReply } from '../../../../drizzle/src/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  await requireUserSession(event, { permission: 'support:chat' });

  const query = getQuery(event);
  const status = (query.status as string) || 'pending';
  const targetType = query.targetType as string | undefined;
  const page = Math.max(1, parseInt(query.page as string || '1'));
  const limit = Math.min(50, parseInt(query.limit as string || '20'));
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [eq(moderationLog.status, status)];
  if (targetType) conditions.push(eq(moderationLog.targetType, targetType));

  const items = await db
    .select({
      id: moderationLog.id,
      targetType: moderationLog.targetType,
      targetId: moderationLog.targetId,
      reason: moderationLog.reason,
      details: moderationLog.details,
      status: moderationLog.status,
      createdAt: moderationLog.createdAt,
      resolvedAt: moderationLog.resolvedAt,
      reportedBy: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(moderationLog)
    .innerJoin(user, eq(moderationLog.reportedBy, user.id))
    .where(and(...conditions))
    .orderBy(desc(moderationLog.createdAt))
    .limit(limit)
    .offset(offset);

  return { items, page, limit };
});

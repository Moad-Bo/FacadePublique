/**
 * server/api/notifications/index.get.ts
 *
 * 📋 GET /api/notifications
 *
 * Récupère les notifications non lues (et les 20 dernières lues) pour la cloche UI.
 * Utilisé pour peupler la liste au chargement du dashboard (avant même le SSE).
 */

import { defineEventHandler } from 'h3';
import { requireUserSession } from '../../utils/auth';
import { db } from '../../utils/db';
import { notification } from '../../../drizzle/src/db/schema';
import { eq, desc, or } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userId = session.user.id;

  const items = await db
    .select()
    .from(notification)
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(30);

  const unreadCount = items.filter(n => !n.isRead).length;

  return { items, unreadCount };
});

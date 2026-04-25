/**
 * server/api/notifications/read.post.ts
 *
 * ✅ POST /api/notifications/read
 *
 * Marque une ou plusieurs notifications comme lues.
 * Body: { ids: string[] } | { all: true }
 */

import { defineEventHandler, readBody } from 'h3';
import { requireUserSession } from '../../utils/auth';
import { db } from '../../utils/db';
import { notification } from '../../../drizzle/src/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userId = session.user.id;
  const body = await readBody(event);

  if (body?.all) {
    // Marquer tout comme lu
    await db.update(notification)
      .set({ isRead: true })
      .where(and(eq(notification.userId, userId), eq(notification.isRead, false)));
    return { success: true, markedAll: true };
  }

  if (Array.isArray(body?.ids) && body.ids.length > 0) {
    await db.update(notification)
      .set({ isRead: true })
      .where(and(
        eq(notification.userId, userId),
        inArray(notification.id, body.ids)
      ));
    return { success: true, markedCount: body.ids.length };
  }

  return { success: false, error: 'Requête invalide — fournissez ids[] ou all: true' };
});

import { db } from '../../../utils/db';
import { forumVote, forumThread, forumReply } from '../../../../drizzle/src/db/schema';
import { requireUserSession } from '../../../utils/auth';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

const voteSchema = z.object({
  targetId: z.string(),
  targetType: z.enum(['thread', 'reply']),
  value: z.number().min(-1).max(1)
});

export default defineEventHandler(async (event) => {
  // Use RBAC protection (assigned via 'membre' role upon CGU acceptance)
  const session = await requireUserSession(event, { permission: 'community-access' });
  const userId = session.user.id;


  const body = await readBody(event);
  const validated = voteSchema.safeParse(body);
  if (!validated.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid vote data' });
  }

  const { targetId, targetType, value } = validated.data;

  try {
    await db.transaction(async (tx) => {
      const existing = await tx.select()
        .from(forumVote)
        .where(and(
          eq(forumVote.userId, userId),
          eq(forumVote.targetId, targetId),
          eq(forumVote.targetType, targetType)
        ))
        .limit(1);

      const oldVoteValue = existing[0]?.value || 0;

      if (value === 0) {
        if (existing.length > 0) {
          await tx.delete(forumVote).where(eq(forumVote.id, existing[0].id));
        }
      } else {
        if (existing.length === 0) {
          await tx.insert(forumVote).values({
            id: crypto.randomUUID(),
            userId,
            targetId,
            targetType,
            value,
            createdAt: new Date()
          });
        } else {
          await tx.update(forumVote)
            .set({ value, createdAt: new Date() })
            .where(eq(forumVote.id, existing[0].id));
        }
      }

      const table = targetType === 'thread' ? forumThread : forumReply;
      const upDiff = (value === 1 ? 1 : 0) - (oldVoteValue === 1 ? 1 : 0);
      const downDiff = (value === -1 ? 1 : 0) - (oldVoteValue === -1 ? 1 : 0);

      await tx.update(table)
        .set({
          upvotes: sql`${table.upvotes} + ${upDiff}`,
          downvotes: sql`${table.downvotes} + ${downDiff}`
        })
        .where(eq(table.id, targetId));
    });

    return { success: true };
  } catch (error) {
    console.error('[API][FORUM] Vote failed:', error);
    throw createError({ statusCode: 500, statusMessage: 'Vote failed' });
  }
});

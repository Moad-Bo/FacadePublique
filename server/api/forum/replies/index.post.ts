import { db } from '../../../utils/db';
import { forumReply, forumThread } from '../../../../drizzle/src/db/schema';
import { requireUserSession } from '../../../utils/auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const replySchema = z.object({
  threadId: z.string(),
  content: z.string().min(2)
});

export default defineEventHandler(async (event) => {
  // RBAC protection (assigned via 'membre' role upon CGU acceptance)
  const session = await requireUserSession(event, { permission: 'community-access' });
  const userId = session.user.id;



  const body = await readBody(event);
  const validated = replySchema.safeParse(body);

  if (!validated.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid reply data',
      data: validated.error.format()
    });
  }

  const { threadId, content } = validated.data;

  try {
    const thread = await db.select().from(forumThread).where(eq(forumThread.id, threadId)).limit(1);
    if (thread.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Thread not found' });
    }

    const id = crypto.randomUUID();
    await db.insert(forumReply).values({
      id,
      threadId,
      authorId: userId,
      content,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return { success: true, id };
  } catch (error) {
    console.error('[API][FORUM] Failed to create reply:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    });
  }
});

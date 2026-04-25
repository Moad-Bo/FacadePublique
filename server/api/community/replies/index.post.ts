import { db } from '../../../utils/db';
import { communityReply, communityTopic, user } from '../../../../drizzle/src/db/schema';
import { requireUserSession } from '../../../utils/auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { notify } from '../../../utils/notify';

const replySchema = z.object({
  topicId: z.string(),
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

  const { topicId, content } = validated.data;

  try {
    const thread = await db.select().from(communityTopic).where(eq(communityTopic.id, topicId)).limit(1);
    if (thread.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Thread not found' });
    }

    const id = crypto.randomUUID();
    await db.insert(communityReply).values({
      id,
      topicId,
      authorId: userId,
      content,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // ── Notification In-App : prévenir l'auteur du thread (≠ répondant lui-même) ────────────
    if (thread[0].authorId !== userId) {
      // Récupérer le nom du répondant pour personnaliser la notif
      const responder = await db.select({ name: user.name })
        .from(user).where(eq(user.id, userId)).limit(1);
      const responderName = responder[0]?.name || 'Quelqu\'un';

      await notify.user(thread[0].authorId as string, {
        type: 'reply',
        title: `${responderName} a répondu à votre sujet`,
        body: thread[0].title as string,
        actionUrl: `/forum/${thread[0].slug}`,
      });
    }

    // 2. Trigger Mentions in the reply content
    const { processMentions } = await import('../../../utils/mentions');
    await processMentions(content, {
      authorName: session.user.name,
      authorEmail: session.user.email,
      contextUrl: `/forum/${thread[0].slug}`
    });

    return { success: true, id };
  } catch (error) {
    console.error('[API][COMMUNITY] Failed to create reply:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    });
  }
});

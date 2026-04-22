import { db } from '../../../utils/db';
import { forumThread, forumCategory, asset } from '../../../../drizzle/src/db/schema';
import { requireUserSession } from '../../../utils/auth';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { kebabCase } from 'scule';

const threadSchema = z.object({
  title: z.string().min(5).max(150),
  categoryId: z.string(),
  content: z.string().min(10),
  assetIds: z.array(z.string()).optional()
});

export default defineEventHandler(async (event) => {
  // Use RBAC protection (assigned via 'membre' role upon CGU acceptance)
  const session = await requireUserSession(event, { permission: 'community-access' });
  const userId = session.user.id;


  const body = await readBody(event);
  const validated = threadSchema.safeParse(body);

  if (!validated.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid thread data',
      data: validated.error.format()
    });
  }

  const { title, categoryId, content, assetIds } = validated.data;

  try {
    const slug = `${kebabCase(title)}-${Math.random().toString(36).substring(2, 8)}`;
    const id = crypto.randomUUID();
    
    await db.insert(forumThread).values({
      id,
      authorId: userId,
      categoryId,
      title,
      slug,
      content,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Link attachments if provided
    if (assetIds && assetIds.length > 0) {
      await db.update(asset)
        .set({ targetId: id, type: 'forum_thread' })
        .where(inArray(asset.id, assetIds));
    }

    return { success: true, id, slug };
  } catch (error) {
    console.error('[API][FORUM] Failed to create thread:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    });
  }
});

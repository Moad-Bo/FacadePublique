import { db } from '../../../utils/db';
import { communityTopic, communityCategory, asset } from '../../../../drizzle/src/db/schema';
import { requireUserSession } from '../../../utils/auth';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { kebabCase } from 'scule';

const threadSchema = z.object({
  title: z.string().min(5).max(150),
  categoryId: z.string().optional(),
  content: z.string().min(10),
  assetIds: z.array(z.string()).optional(),
  context: z.string().default('forum'), // forum, blog, system
  externalId: z.string().optional()
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
      statusMessage: 'Invalid topic data',
      data: validated.error.format()
    });
  }

  const { title, categoryId, content, assetIds, context, externalId } = validated.data;

  try {
    const slug = `${kebabCase(title)}-${Math.random().toString(36).substring(2, 8)}`;
    const id = crypto.randomUUID();
    
    await db.insert(communityTopic).values({
      id,
      authorId: userId,
      categoryId: categoryId || null,
      title,
      slug,
      content,
      status: 'open',
      context: context as any,
      externalId: externalId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 1. Trigger Mentions
    const { processMentions } = await import('../../../utils/mentions');
    await processMentions(content, {
      authorName: session.user.name,
      authorEmail: session.user.email,
      contextUrl: `/forum/${slug}`
    });

    return { success: true, id, slug };
  } catch (error) {
    console.error('[API][COMMUNITY] Failed to create topic:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    });
  }
});

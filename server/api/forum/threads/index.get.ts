import { db } from '../../../utils/db';
import { forumThread, user, forumCategory } from '../../../../drizzle/src/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const categorySlug = query.category as string;

  try {
    const baseQuery = db.select({
      id: forumThread.id,
      title: forumThread.title,
      slug: forumThread.slug,
      isResolved: forumThread.isResolved,
      isPinned: forumThread.isPinned,
      upvotes: forumThread.upvotes,
      downvotes: forumThread.downvotes,
      createdAt: forumThread.createdAt,
      author: {
        name: user.name,
        image: user.image
      },
      category: {
        name: forumCategory.name,
        slug: forumCategory.slug,
        color: forumCategory.color
      },
      repliesCount: sql<number>`(SELECT COUNT(*) FROM forum_reply WHERE thread_id = ${forumThread.id})`.mapWith(Number)
    })
    .from(forumThread)
    .innerJoin(user, eq(forumThread.authorId, user.id))
    .innerJoin(forumCategory, eq(forumThread.categoryId, forumCategory.id));

    let results;
    if (categorySlug) {
      results = await baseQuery
        .where(eq(forumCategory.slug, categorySlug))
        .orderBy(desc(forumThread.isPinned), desc(forumThread.createdAt));
    } else {
      results = await baseQuery
        .orderBy(desc(forumThread.isPinned), desc(forumThread.createdAt));
    }

    return results;
  } catch (error) {
    console.error('[API][FORUM] Failed to fetch threads:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch threads'
    });
  }
});

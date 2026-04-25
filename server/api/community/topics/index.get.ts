import { db } from '../../../utils/db';
import { communityTopic, user, communityCategory } from '../../../../drizzle/src/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const categorySlug = query.category as string;

  try {
    const baseQuery = db.select({
      id: communityTopic.id,
      title: communityTopic.title,
      slug: communityTopic.slug,
      isResolved: communityTopic.isResolved,
      isSticky: communityTopic.isSticky,
      upvotes: communityTopic.upvotes,
      downvotes: communityTopic.downvotes,
      createdAt: communityTopic.createdAt,
      author: {
        name: user.name,
        image: user.image
      },
      category: {
        name: communityCategory.name,
        slug: communityCategory.slug,
        color: communityCategory.color
      },
      repliesCount: sql<number>`(SELECT COUNT(*) FROM community_reply WHERE topic_id = ${communityTopic.id})`.mapWith(Number)
    })
    .from(communityTopic)
    .innerJoin(user, eq(communityTopic.authorId, user.id))
    .innerJoin(communityCategory, eq(communityTopic.categoryId, communityCategory.id));

    let results;
    if (categorySlug) {
      results = await baseQuery
        .where(eq(communityCategory.slug, categorySlug))
        .orderBy(desc(communityTopic.isSticky), desc(communityTopic.createdAt));
    } else {
      results = await baseQuery
        .orderBy(desc(communityTopic.isSticky), desc(communityTopic.createdAt));
    }

    return results;
  } catch (error) {
    console.error('[API][COMMUNITY] Failed to fetch threads:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch threads'
    });
  }
});

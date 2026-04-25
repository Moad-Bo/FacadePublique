import { db } from '../../../utils/db';
import { communityTopic, user, communityCategory, communityReply, asset } from '../../../../drizzle/src/db/schema';
import { eq, asc, or, and, inArray } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Thread ID is required'
    });
  }

  try {
    const threadResult = await db.select({
      id: communityTopic.id,
      title: communityTopic.title,
      slug: communityTopic.slug,
      content: communityTopic.content,
      isResolved: communityTopic.isResolved,
      isSticky: communityTopic.isSticky,
      upvotes: communityTopic.upvotes,
      downvotes: communityTopic.downvotes,
      createdAt: communityTopic.createdAt,
      author: {
        id: user.id,
        name: user.name,
        image: user.image,
        role: user.role
      },
      category: {
        id: communityCategory.id,
        name: communityCategory.name,
        slug: communityCategory.slug,
        color: communityCategory.color
      }
    })
    .from(communityTopic)
    .innerJoin(user, eq(communityTopic.authorId, user.id))
    .innerJoin(communityCategory, eq(communityTopic.categoryId, communityCategory.id))
    .where(eq(communityTopic.id, id))
    .limit(1);

    const threadData = threadResult[0];

    if (!threadData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Thread not found'
      });
    }

    // Fetch assets for thread
    const threadAssets = await db.select().from(asset).where(and(eq(asset.targetId, id), eq(asset.type, 'community_topic')));

    const repliesData = await db.select({
      id: communityReply.id,
      content: communityReply.content,
      isSolution: communityReply.isSolution,
      upvotes: communityReply.upvotes,
      downvotes: communityReply.downvotes,
      createdAt: communityReply.createdAt,
      author: {
        id: user.id,
        name: user.name,
        image: user.image,
        role: user.role
      }
    })
    .from(communityReply)
    .innerJoin(user, eq(communityReply.authorId, user.id))
    .where(eq(communityReply.topicId, id))
    .orderBy(asc(communityReply.createdAt));

    // Fetch assets for all replies in one query
    const replyIds = repliesData.map(r => r.id);
    let allReplyAssets: any[] = [];
    if (replyIds.length > 0) {
      allReplyAssets = await db.select().from(asset).where(and(inArray(asset.targetId, replyIds), eq(asset.type, 'community_reply')));
    }

    const replies = repliesData.map(reply => ({
      ...reply,
      attachments: allReplyAssets.filter(a => a.targetId === reply.id)
    }));

    return {
      thread: {
        ...threadData,
        attachments: threadAssets
      },
      replies
    };
  } catch (error) {
    console.error(`[API][COMMUNITY] Failed to fetch thread ${id}:`, error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    });
  }
});
